import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { cards } from "@/db/schema";
import { limparRevalidacoes, revalidacoes } from "@/db/test-support/next-cache";
import type { ActionState } from "@/shared/action-state";
import { semearAula, semearCard, semearNota } from "@/shared/test-seed";

import { setCardSuspended } from "./actions";
import { listCardsForNote } from "./queries";

const inicial: ActionState = { ok: true };

function form(campos: Record<string, string>): FormData {
  const data = new FormData();
  for (const [chave, valor] of Object.entries(campos)) data.set(chave, valor);
  return data;
}

describe("queries e actions de cards", () => {
  it("listCardsForNote devolve na ordem de ordinal", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    await semearCard(noteId, { ordinal: 2, prompt: "Terceiro", answer: "C" });
    await semearCard(noteId, { ordinal: 0, prompt: "Primeiro", answer: "A" });
    await semearCard(noteId, { ordinal: 1, prompt: "Segundo", answer: "B" });

    const { active, archived } = await listCardsForNote(noteId);

    expect(archived).toBe(0);
    expect(active.map((c) => [c.ordinal, c.prompt, c.answer])).toEqual([
      [0, "Primeiro", "A"],
      [1, "Segundo", "B"],
      [2, "Terceiro", "C"],
    ]);
  });

  it("listCardsForNote omite card arquivado", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    await semearCard(noteId, { ordinal: 0, prompt: "Ativo" });
    const { cardId } = await semearCard(noteId, {
      ordinal: 1,
      prompt: "Arquivado",
      archivedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { active, archived } = await listCardsForNote(noteId);

    expect(active.map((c) => c.prompt)).toEqual(["Ativo"]);
    expect(active.some((c) => c.id === cardId)).toBe(false);
    expect(archived).toBe(1);
  });

  it("setCardSuspended suspende e reativa, e revalida o layout", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    const due = new Date("2026-06-01T10:00:00.000Z");
    const { cardId } = await semearCard(noteId, {
      due,
      state: "review",
      fsrs: { reps: 3, stability: 9.5, difficulty: 5.5 },
    });

    const suspenso = await setCardSuspended(
      inicial,
      form({ id: cardId, suspended: "true" }),
    );

    expect(suspenso).toEqual({ ok: true });
    expect(revalidacoes).toContainEqual({ path: "/", type: "layout" });
    let linha = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    expect(linha?.suspended).toBe(true);
    expect(linha?.reps).toBe(3);
    expect(linha?.stability).toBe(9.5);
    expect(linha?.due.getTime()).toBe(due.getTime());
    expect((await listCardsForNote(noteId)).active[0]?.suspended).toBe(true);

    limparRevalidacoes();
    const retomado = await setCardSuspended(
      inicial,
      form({ id: cardId, suspended: "false" }),
    );

    expect(retomado).toEqual({ ok: true });
    expect(revalidacoes).toContainEqual({ path: "/", type: "layout" });
    linha = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    expect(linha?.suspended).toBe(false);
    expect(linha?.reps).toBe(3);
  });

  it("setCardSuspended não suspende card arquivado", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    const { cardId } = await semearCard(noteId, {
      archivedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const r = await setCardSuspended(
      inicial,
      form({ id: cardId, suspended: "true" }),
    );

    // A guarda é silenciosa: o UPDATE não casa nenhuma linha e a action
    // devolve sucesso (e revalida), em vez de ok: false ou lançar.
    expect(r).toEqual({ ok: true });
    const linha = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    expect(linha?.suspended).toBe(false);
  });
});
