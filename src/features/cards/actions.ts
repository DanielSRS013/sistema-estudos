"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { cards } from "@/db/schema";
import type { ActionState } from "@/shared/action-state";

import { setCardSuspendedSchema } from "./schemas";

const FALHA_GENERICA =
  "Não foi possível mudar o card agora. Confira a conexão e tente de novo.";

/**
 * Suspende ou retoma um card.
 *
 * O `UPDATE` toca em **uma** coluna de propósito: suspender não é avaliar.
 * Nada de `reviews`, nada do estado do FSRS — `due`, `reps`, `stability` e
 * companhia ficam exatamente onde estavam, e o card volta para a fila no
 * mesmo ponto em que saiu. Quem tira o card da fila é o filtro das consultas
 * (`cards_queue_idx`), não uma alteração de histórico.
 *
 * Card arquivado fica de fora: ele já saiu da nota, e o `isNull(archivedAt)`
 * evita suspender o que nenhuma interface mostra.
 */
export async function setCardSuspended(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = setCardSuspendedSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Entrada inválida.";
    return { ok: false, message };
  }

  const { id, suspended } = parsed.data;

  try {
    await db
      .update(cards)
      .set({ suspended })
      .where(and(eq(cards.id, id), isNull(cards.archivedAt)));
  } catch (error) {
    console.error(error);
    return { ok: false, message: FALHA_GENERICA };
  }

  // O corte da fila mudou: painel, /review, margem da nota e página do
  // conceito leem o mesmo card.
  revalidatePath("/", "layout");

  return { ok: true };
}
