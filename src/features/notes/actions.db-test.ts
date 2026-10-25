import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { cards, noteTags, notes, tags } from "@/db/schema";
import { ErroDeRedirect } from "@/db/test-support/next-navigation";
import { limparRevalidacoes, revalidacoes } from "@/db/test-support/next-cache";
import type { ActionState } from "@/shared/action-state";
import { semearAula, semearNota } from "@/shared/test-seed";

import { createNote, moveNote, saveNote, setNoteKind } from "./actions";

const inicial: ActionState = { ok: true };
const FALHA_GENERICA =
  "Não foi possível salvar agora. Confira a conexão e tente de novo.";

function form(campos: Record<string, string>): FormData {
  const data = new FormData();
  for (const [chave, valor] of Object.entries(campos)) data.set(chave, valor);
  return data;
}

async function notaPorId(id: string) {
  return db.query.notes.findFirst({ where: eq(notes.id, id) });
}

function caminhos(): string[] {
  return revalidacoes.map((r) => r.path);
}

// Semeia uma nota com valores que não são os padrões, e devolve o que gravou,
// para a asserção de irmã intacta comparar valor por valor.
async function semearIrma(lessonId: string) {
  const { noteId } = await semearNota(lessonId, {
    title: "Irmã intacta",
    content: "Texto da irmã.",
    kind: "solution",
  });
  const antes = await notaPorId(noteId);
  if (!antes) throw new Error("a irmã não foi criada");
  return { noteId, antes };
}

async function expectIrmaIntacta(noteId: string, antes: Awaited<ReturnType<typeof notaPorId>>) {
  const depois = await notaPorId(noteId);
  expect(depois?.title).toBe(antes?.title);
  expect(depois?.kind).toBe(antes?.kind);
  expect(depois?.lessonId).toBe(antes?.lessonId);
  expect(depois?.content).toBe(antes?.content);
  expect(depois?.updatedAt.getTime()).toBe(antes?.updatedAt.getTime());
}

describe("actions de notas", () => {
  it("createNote grava a nota e redireciona para o editor", async () => {
    const { lessonId } = await semearAula();

    const erro = await createNote(
      inicial,
      form({ lessonId, title: "  Nota nova  " }),
    ).then(
      () => null,
      (e: unknown) => e,
    );

    expect(erro).toBeInstanceOf(ErroDeRedirect);
    if (!(erro instanceof ErroDeRedirect)) throw new Error("sem redirect");
    const criadas = await db.query.notes.findMany({
      where: eq(notes.lessonId, lessonId),
    });
    expect(criadas).toHaveLength(1);
    expect(criadas[0]?.title).toBe("Nota nova");
    expect(erro.url).toBe(`/notes/${criadas[0]?.id}/edit`);
    expect(caminhos()).toContain(`/lessons/${lessonId}`);
  });

  it("createNote sem título devolve a mensagem do schema e não grava", async () => {
    const { lessonId } = await semearAula();

    const resultado = await createNote(inicial, form({ lessonId, title: "  " }));

    expect(resultado).toEqual({
      ok: false,
      message: "O título não pode ficar vazio.",
    });
    expect(
      await db.query.notes.findMany({ where: eq(notes.lessonId, lessonId) }),
    ).toHaveLength(0);
    expect(revalidacoes).toHaveLength(0);
  });

  it("createNote com lessonId inexistente devolve mensagem legível", async () => {
    const resultado = await createNote(
      inicial,
      form({ lessonId: crypto.randomUUID(), title: "Órfã" }),
    );

    expect(resultado).toEqual({ ok: false, message: FALHA_GENERICA });
    expect(revalidacoes).toHaveLength(0);
  });

  it("moveNote troca a aula, revalida a origem e varre o layout", async () => {
    const origem = await semearAula();
    const destino = await semearAula();
    const { noteId } = await semearNota(origem.lessonId, { title: "Móvel" });
    const irma = await semearIrma(origem.lessonId);
    const antes = await notaPorId(noteId);

    const resultado = await moveNote(
      inicial,
      form({ id: noteId, lessonId: destino.lessonId }),
    );

    expect(resultado).toEqual({ ok: true });
    const depois = await notaPorId(noteId);
    expect(depois?.lessonId).toBe(destino.lessonId);
    expect(depois?.title).toBe("Móvel");
    expect(depois?.updatedAt.getTime()).toBeGreaterThan(
      antes?.updatedAt.getTime() ?? Infinity,
    );
    expect(caminhos()).toContain(`/lessons/${origem.lessonId}`);
    // O destino não é nomeado de propósito: `revalidatePath("/", "layout")`
    // invalida a árvore inteira abaixo da raiz, destino incluído. Só a origem
    // tem chamada própria, e é ela que a asserção acima fixa.
    expect(revalidacoes).toContainEqual({ path: "/", type: "layout" });
    await expectIrmaIntacta(irma.noteId, irma.antes);
  });

  it("moveNote com nota inexistente devolve a mensagem exata", async () => {
    const destino = await semearAula();

    const resultado = await moveNote(
      inicial,
      form({ id: crypto.randomUUID(), lessonId: destino.lessonId }),
    );

    expect(resultado).toEqual({ ok: false, message: "Nota não encontrada." });
    expect(revalidacoes).toHaveLength(0);
  });

  it("moveNote para aula inexistente devolve a frase única e não move", async () => {
    const origem = await semearAula();
    const { noteId } = await semearNota(origem.lessonId);

    const resultado = await moveNote(
      inicial,
      form({ id: noteId, lessonId: crypto.randomUUID() }),
    );

    expect(resultado).toEqual({ ok: false, message: FALHA_GENERICA });
    expect((await notaPorId(noteId))?.lessonId).toBe(origem.lessonId);
  });

  it("setNoteKind muda o kind e toca updatedAt", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId, { kind: "lesson_note" });
    const irma = await semearIrma(lessonId);
    await db
      .update(notes)
      .set({ updatedAt: new Date("2020-01-01T00:00:00Z") })
      .where(eq(notes.id, noteId));

    const resultado = await setNoteKind({ id: noteId, kind: "summary" });

    expect(resultado).toEqual({ ok: true });
    const depois = await notaPorId(noteId);
    expect(depois?.kind).toBe("summary");
    expect(depois?.updatedAt.getTime()).toBeGreaterThan(
      new Date("2020-01-01T00:00:00Z").getTime(),
    );
    expect(caminhos()).toEqual(
      expect.arrayContaining([`/notes/${noteId}`, `/lessons/${lessonId}`, "/"]),
    );
    await expectIrmaIntacta(irma.noteId, irma.antes);
  });

  it("setNoteKind com tipo inválido devolve a mensagem do schema", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);

    const resultado = await setNoteKind({ id: noteId, kind: "rascunho" });

    expect(resultado).toEqual({ ok: false, message: "Tipo de nota inválido." });
    expect((await notaPorId(noteId))?.kind).toBe("lesson_note");
  });

  it("setNoteKind com nota inexistente devolve a mensagem exata", async () => {
    const resultado = await setNoteKind({
      id: crypto.randomUUID(),
      kind: "summary",
    });

    expect(resultado).toEqual({ ok: false, message: "Nota não encontrada." });
  });

  it("saveNote grava conteúdo, cria os cards do texto e devolve o total", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId, { title: "Antes" });
    const irma = await semearIrma(lessonId);
    const conteudo =
      "A capital do Brasil é {{Brasília}}.\n\nQ:: Quanto é 2 + 2?\nA:: Quatro.";

    const resultado = await saveNote({
      id: noteId,
      title: "Depois",
      content: conteudo,
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error(resultado.message);
    expect(resultado.cardCount).toBe(2);
    expect(resultado.issues).toEqual([]);
    expect(resultado.tags).toEqual([]);
    const gravada = await notaPorId(noteId);
    expect(gravada?.title).toBe("Depois");
    expect(gravada?.content).toBe(conteudo);
    expect(resultado.savedAt).toBe(gravada?.updatedAt.toISOString());
    const criados = await db.query.cards.findMany({
      where: eq(cards.noteId, noteId),
    });
    expect(criados).toHaveLength(2);
    expect(criados.map((c) => c.kind).sort()).toEqual(["cloze", "qa"]);
    expect(caminhos()).toContain(`/notes/${noteId}`);
    await expectIrmaIntacta(irma.noteId, irma.antes);
    expect(
      await db.query.cards.findMany({ where: eq(cards.noteId, irma.noteId) }),
    ).toHaveLength(0);
  });

  it("saveNote sem tag no texto não revalida a página de tag", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);

    const resultado = await saveNote({
      id: noteId,
      title: "Sem conceito",
      content: "Texto sem conceito nenhum.",
    });

    expect(resultado.ok).toBe(true);
    expect(caminhos()).not.toContain("/tags/[tagSlug]");
  });

  it("saveNote revalida a página da tag quando o texto cita um conceito", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);

    const resultado = await saveNote({
      id: noteId,
      title: "Com conceito",
      content: "Isto trata de #norma e nada mais.",
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error(resultado.message);
    expect(resultado.tags).toEqual(["norma"]);
    // Chamada de 2 argumentos: o stub grava o `type`.
    expect(revalidacoes).toContainEqual({
      path: "/tags/[tagSlug]",
      type: "page",
    });
    expect(caminhos()).toContain(`/notes/${noteId}`);
    const vinculos = await db
      .select({ slug: tags.slug })
      .from(noteTags)
      .innerJoin(tags, eq(tags.id, noteTags.tagId))
      .where(eq(noteTags.noteId, noteId));
    expect(vinculos.map((v) => v.slug)).toEqual(["norma"]);
  });

  it("saveNote revalida a página da tag também quando o texto deixa de citá-la", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    await saveNote({ id: noteId, title: "T", content: "Fala de #norma." });
    limparRevalidacoes();

    const resultado = await saveNote({
      id: noteId,
      title: "T",
      content: "Não fala mais.",
    });

    expect(resultado.ok).toBe(true);
    expect(revalidacoes).toContainEqual({
      path: "/tags/[tagSlug]",
      type: "page",
    });
    const vinculos = await db
      .select({ tagId: noteTags.tagId })
      .from(noteTags)
      .where(eq(noteTags.noteId, noteId));
    expect(vinculos).toHaveLength(0);
  });

  it("saveNote com título vazio devolve a mensagem do schema e não grava", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId, {
      title: "Original",
      content: "Original.",
    });

    const resultado = await saveNote({ id: noteId, title: " ", content: "X" });

    expect(resultado).toEqual({
      ok: false,
      message: "O título não pode ficar vazio.",
    });
    const depois = await notaPorId(noteId);
    expect(depois?.title).toBe("Original");
    expect(depois?.content).toBe("Original.");
  });

  it("saveNote com id inexistente devolve ok: false", async () => {
    const resultado = await saveNote({
      id: crypto.randomUUID(),
      title: "Fantasma",
      content: "x",
    });

    expect(resultado).toEqual({ ok: false, message: "Nota não encontrada." });
    expect(revalidacoes).toHaveLength(0);
  });
});
