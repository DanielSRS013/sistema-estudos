"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { notes } from "@/db/schema";
import type { ParseIssue } from "@/features/cards/parser";
import { cardWrites, planCards } from "@/features/cards/sync";
import type { ActionState } from "@/shared/action-state";

import { createNoteSchema, moveNoteSchema, saveNoteSchema } from "./schemas";

const FALHA_GENERICA =
  "Não foi possível salvar agora. Confira a conexão e tente de novo.";

/* ──────────────────────────── criar e mover ──────────────────────────── */

/** Cria a nota a partir da aula e abre o editor já nela. */
export async function createNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createNoteSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Entrada inválida.";
    return { ok: false, message };
  }

  let id: string;

  try {
    const [criada] = await db
      .insert(notes)
      .values({ lessonId: parsed.data.lessonId, title: parsed.data.title })
      .returning({ id: notes.id });

    if (!criada) return { ok: false, message: FALHA_GENERICA };

    id = criada.id;
  } catch (error) {
    console.error(error);
    return { ok: false, message: FALHA_GENERICA };
  }

  revalidatePath(`/lessons/${parsed.data.lessonId}`);

  // Fora do try: o redirect do Next funciona lançando, e um catch o engoliria.
  redirect(`/notes/${id}/edit`);
}

/** Move a nota para outra aula. Os cards acompanham, por serem da nota. */
export async function moveNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = moveNoteSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Entrada inválida.";
    return { ok: false, message };
  }

  const { id, lessonId } = parsed.data;

  try {
    const anterior = await db.query.notes.findFirst({
      where: (n, { eq: igual }) => igual(n.id, id),
      columns: { lessonId: true },
    });

    if (!anterior) return { ok: false, message: "Nota não encontrada." };

    await db
      .update(notes)
      .set({ lessonId, updatedAt: new Date() })
      .where(eq(notes.id, id));

    revalidatePath(`/lessons/${anterior.lessonId}`);
  } catch (error) {
    console.error(error);
    return { ok: false, message: FALHA_GENERICA };
  }

  // A nota mudou de lugar na árvore: o rail e a aula de destino precisam ver.
  revalidatePath("/", "layout");

  return { ok: true };
}

/* ────────────────────────────── autosave ─────────────────────────────── */

export type SaveResult =
  | {
      ok: true;
      savedAt: string;
      /** Problemas de sintaxe de card, para a UI mostrar — nunca silêncio. */
      issues: ParseIssue[];
      /** Cards ativos que a nota tem depois desta gravação. */
      cardCount: number;
    }
  | { ok: false; message: string };

/**
 * Gravação do editor. Não é um formulário: o cliente chama com o texto atual
 * quando o debounce estoura, e recebe de volta o `updatedAt` que o servidor
 * gravou — a hora do indicador é a do servidor, não a do navegador.
 *
 * O texto e os cards dele vão no mesmo `db.batch`, que o driver HTTP do Neon
 * executa como uma transação só: ou a nota e os cards mudam juntos, ou nada
 * muda. Nenhum caminho daqui apaga card — ver SPEC §3.4.
 */
export async function saveNote(input: unknown): Promise<SaveResult> {
  const parsed = saveNoteSchema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Entrada inválida.";
    return { ok: false, message };
  }

  const { id, title, content } = parsed.data;
  const updatedAt = new Date();

  try {
    const [nota, planejado] = await Promise.all([
      db.query.notes.findFirst({
        where: (n, { eq: igual }) => igual(n.id, id),
        columns: { id: true },
      }),
      planCards(id, content),
    ]);

    if (!nota) return { ok: false, message: "Nota não encontrada." };

    const escritas = [
      db.update(notes).set({ title, content, updatedAt }).where(eq(notes.id, id)),
      ...cardWrites(id, planejado.plan, updatedAt),
    ];
    const [primeira, ...resto] = escritas;

    if (primeira) await db.batch([primeira, ...resto]);

    // A leitura mostra título e margem de cards; o editor não recarrega.
    revalidatePath(`/notes/${id}`);

    return {
      ok: true,
      savedAt: updatedAt.toISOString(),
      issues: planejado.issues,
      cardCount: planejado.total,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: FALHA_GENERICA };
  }
}
