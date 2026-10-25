import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { cards, notes, reviews } from "@/db/schema";
import { saveNote } from "@/features/notes/actions";
import {
  semearAula,
  semearCard,
  semearNota,
  semearRevisao,
} from "@/shared/test-seed";

import { anchorKey } from "./reconcile";
import { cardWrites, planCards } from "./sync";

// O mesmo caminho da produção: planCards, db.batch(cardWrites) e releitura.
async function gravar(noteId: string, content: string, now: Date) {
  const planejado = await planCards(noteId, content);
  const [primeira, ...resto] = cardWrites(noteId, planejado.plan, now);
  if (primeira) await db.batch([primeira, ...resto]);
  return planejado;
}

async function cardsDaNota(noteId: string) {
  return db.query.cards.findMany({
    where: eq(cards.noteId, noteId),
    orderBy: [asc(cards.ordinal)],
  });
}

const AGORA = new Date("2026-03-10T12:00:00.000Z");

describe("ponte parser → banco", () => {
  it("texto novo insere um card por trecho", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    const texto = [
      "Q:: Qual é a capital do Brasil?",
      "A:: Brasília.",
      "",
      "A fórmula de Bhaskara usa {{o discriminante::pense em b² - 4ac}} para as raízes.",
    ].join("\n");

    const planejado = await gravar(noteId, texto, AGORA);

    expect(planejado.total).toBe(2);
    expect(planejado.issues).toEqual([]);
    const linhas = await cardsDaNota(noteId);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatchObject({
      noteId,
      kind: "qa",
      ordinal: 0,
      prompt: "Qual é a capital do Brasil?",
      answer: "Brasília.",
      hint: null,
      archivedAt: null,
      state: "new",
      reps: 0,
      anchorKey: anchorKey("Qual é a capital do Brasil?", "Brasília."),
    });
    expect(linhas[1]).toMatchObject({
      kind: "cloze",
      ordinal: 1,
      prompt: "A fórmula de Bhaskara usa […] para as raízes.",
      answer: "o discriminante",
      hint: "pense em b² - 4ac",
      archivedAt: null,
    });
    expect(linhas[1]?.anchorKey).toBe(
      anchorKey(
        "A fórmula de Bhaskara usa […] para as raízes.",
        "o discriminante",
      ),
    );
  });

  it("editar o enunciado atualiza o card e preserva o histórico FSRS", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    // Os dois prompts diferem em 6 de 50 caracteres (similaridade 0,88), e o
    // casamento por posição em reconcile.ts exige LIMITE_SIMILARIDADE = 0,8.
    // Mexer neste texto ou no limiar derruba o teste por similaridade, não
    // por perda de histórico FSRS.
    const promptAntigo = "Qual é a capital do Brasil, país da América do Sul?";
    const promptNovo = "Qual é a capital do Brasil, país da América Latina?";
    const answer = "Brasília.";
    const due = new Date("2026-04-02T08:30:00.000Z");
    const lastReview = new Date("2026-03-01T09:00:00.000Z");

    const { cardId } = await semearCard(noteId, {
      anchorKey: anchorKey(promptAntigo, answer),
      ordinal: 0,
      kind: "qa",
      prompt: promptAntigo,
      answer,
      state: "review",
      due,
      fsrs: {
        reps: 7,
        stability: 23.5,
        difficulty: 6.25,
        lapses: 2,
        learningSteps: 1,
        elapsedDays: 4,
        scheduledDays: 12,
        lastReview,
      },
    });
    const { reviewId: r1 } = await semearRevisao(cardId, {
      rating: "good",
      reviewedAt: new Date("2026-02-20T10:00:00.000Z"),
    });
    const { reviewId: r2 } = await semearRevisao(cardId, {
      rating: "again",
      reviewedAt: lastReview,
    });

    const planejado = await gravar(
      noteId,
      `Q:: ${promptNovo}\nA:: ${answer}`,
      AGORA,
    );

    expect(planejado.plan.create).toEqual([]);
    expect(planejado.plan.archive).toEqual([]);
    expect(planejado.plan.update).toHaveLength(1);

    const linhas = await cardsDaNota(noteId);
    expect(linhas).toHaveLength(1);
    const card = linhas[0];
    expect(card?.id).toBe(cardId);
    expect(card?.prompt).toBe(promptNovo);
    expect(card?.answer).toBe(answer);
    expect(card?.anchorKey).toBe(anchorKey(promptNovo, answer));
    expect(card?.archivedAt).toBeNull();
    expect(card?.state).toBe("review");
    expect(card?.reps).toBe(7);
    expect(card?.stability).toBe(23.5);
    expect(card?.difficulty).toBe(6.25);
    expect(card?.lapses).toBe(2);
    expect(card?.learningSteps).toBe(1);
    expect(card?.elapsedDays).toBe(4);
    expect(card?.scheduledDays).toBe(12);
    expect(card?.due.getTime()).toBe(due.getTime());
    expect(card?.lastReview?.getTime()).toBe(lastReview.getTime());

    const historico = await db.query.reviews.findMany({
      where: eq(reviews.cardId, cardId),
    });
    expect(historico.map((r) => r.id).sort()).toEqual([r1, r2].sort());
    expect(historico.every((r) => r.cardId === cardId)).toBe(true);
  });

  it("trecho removido arquiva o card em vez de apagar a linha", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    await gravar(
      noteId,
      "Q:: Pergunta que fica?\nA:: Fica.\n\nQ:: Pergunta que sai?\nA:: Sai.",
      AGORA,
    );
    const antes = await cardsDaNota(noteId);
    const sai = antes.find((c) => c.prompt === "Pergunta que sai?");
    expect(sai).toBeDefined();
    if (!sai) return;
    const { reviewId } = await semearRevisao(sai.id);

    const depois = new Date("2026-03-11T12:00:00.000Z");
    await gravar(noteId, "Q:: Pergunta que fica?\nA:: Fica.", depois);

    const linhas = await cardsDaNota(noteId);
    expect(linhas).toHaveLength(2);
    const arquivado = linhas.find((c) => c.id === sai.id);
    expect(arquivado).toBeDefined();
    expect(arquivado?.archivedAt?.getTime()).toBe(depois.getTime());
    expect(arquivado?.prompt).toBe("Pergunta que sai?");
    expect(arquivado?.answer).toBe("Sai.");
    const fica = linhas.find((c) => c.prompt === "Pergunta que fica?");
    expect(fica?.archivedAt).toBeNull();
    const historico = await db.query.reviews.findMany({
      where: eq(reviews.cardId, sai.id),
    });
    expect(historico.map((r) => r.id)).toEqual([reviewId]);
  });

  it("trecho que volta desarquiva o mesmo card, com as revisões intactas", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    const due = new Date("2026-05-05T05:05:05.000Z");
    const { cardId } = await semearCard(noteId, {
      anchorKey: anchorKey("Pergunta que volta?", "Volta."),
      ordinal: 0,
      prompt: "Pergunta que volta?",
      answer: "Volta.",
      state: "review",
      due,
      fsrs: {
        reps: 5,
        stability: 18.25,
        difficulty: 4.5,
        lapses: 1,
        learningSteps: 0,
      },
    });
    const { reviewId } = await semearRevisao(cardId, { rating: "easy" });

    // Some do texto: o card é arquivado.
    await gravar(noteId, "Texto sem nenhum trecho.", AGORA);
    const arquivado = await cardsDaNota(noteId);
    expect(arquivado).toHaveLength(1);
    expect(arquivado[0]?.id).toBe(cardId);
    expect(arquivado[0]?.archivedAt?.getTime()).toBe(AGORA.getTime());

    // O trecho reaparece.
    const planejado = await gravar(
      noteId,
      "Q:: Pergunta que volta?\nA:: Volta.",
      AGORA,
    );

    expect(planejado.plan.update).toHaveLength(1);
    expect(planejado.plan.update[0]?.unarchive).toBe(true);
    expect(planejado.plan.create).toEqual([]);
    const linhas = await cardsDaNota(noteId);
    expect(linhas).toHaveLength(1);
    const card = linhas[0];
    expect(card?.id).toBe(cardId);
    expect(card?.archivedAt).toBeNull();
    expect(card?.prompt).toBe("Pergunta que volta?");
    expect(card?.reps).toBe(5);
    expect(card?.stability).toBe(18.25);
    expect(card?.difficulty).toBe(4.5);
    expect(card?.lapses).toBe(1);
    expect(card?.state).toBe("review");
    expect(card?.due.getTime()).toBe(due.getTime());
    const historico = await db.query.reviews.findMany({
      where: eq(reviews.cardId, cardId),
    });
    expect(historico.map((r) => r.id)).toEqual([reviewId]);
  });

  it("âncora repetida na mesma nota não derruba a gravação", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId, { content: "" });
    const texto = [
      "Q:: Pergunta repetida?",
      "A:: Resposta repetida.",
      "",
      "Q:: Pergunta repetida?",
      "A:: Resposta repetida.",
    ].join("\n");

    const planejado = await planCards(noteId, texto);
    const [primeira, ...resto] = cardWrites(noteId, planejado.plan, AGORA);
    expect(primeira).toBeDefined();
    if (!primeira) return;
    await expect(db.batch([primeira, ...resto])).resolves.toBeDefined();

    const linhas = await cardsDaNota(noteId);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      kind: "qa",
      prompt: "Pergunta repetida?",
      answer: "Resposta repetida.",
      archivedAt: null,
    });
    expect(planejado.total).toBe(1);
    const repetidos = planejado.issues.filter(
      (i) => i.title === "trecho repetido",
    );
    expect(repetidos).toHaveLength(1);
    expect(repetidos[0]?.line).toBe(4);

    // O caminho real: a nota inteira precisa salvar, com o aviso.
    const salvo = await saveNote({
      id: noteId,
      title: "Com repetição",
      content: texto,
    });
    expect(salvo.ok).toBe(true);
    if (!salvo.ok) return;
    expect(salvo.cardCount).toBe(1);
    expect(salvo.issues.map((i) => i.title)).toContain("trecho repetido");
    const nota = await db.query.notes.findFirst({ where: eq(notes.id, noteId) });
    expect(nota?.content).toBe(texto);
    expect(nota?.title).toBe("Com repetição");
    expect(await cardsDaNota(noteId)).toHaveLength(1);
  });

  it("inverter a ordem dos trechos troca só o ordinal e mantém os mesmos cards", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    const a = ["Q:: Primeira pergunta?", "A:: Primeira resposta."].join("\n");
    const b = ["Q:: Segunda pergunta?", "A:: Segunda resposta."].join("\n");
    await gravar(noteId, [a, b].join("\n\n"), AGORA);
    const antes = await cardsDaNota(noteId);
    const idA = antes.find((c) => c.prompt === "Primeira pergunta?")?.id;
    const idB = antes.find((c) => c.prompt === "Segunda pergunta?")?.id;
    expect(idA).toBeDefined();
    expect(idB).toBeDefined();
    expect(antes.map((c) => c.ordinal)).toEqual([0, 1]);

    const planejado = await gravar(noteId, [b, a].join("\n\n"), AGORA);

    expect(planejado.plan.create).toEqual([]);
    expect(planejado.plan.archive).toEqual([]);
    expect(planejado.plan.update).toHaveLength(2);
    const depois = await cardsDaNota(noteId);
    expect(depois).toHaveLength(2);
    expect(depois.map((c) => [c.id, c.ordinal, c.prompt, c.archivedAt])).toEqual([
      [idB, 0, "Segunda pergunta?", null],
      [idA, 1, "Primeira pergunta?", null],
    ]);
  });

  it("nota sem trecho algum grava zero card e total 0", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);

    const planejado = await planCards(noteId, "Só texto corrido, sem trecho.");

    expect(planejado.total).toBe(0);
    expect(planejado.issues).toEqual([]);
    expect(cardWrites(noteId, planejado.plan, AGORA)).toEqual([]);
    expect(await cardsDaNota(noteId)).toEqual([]);
  });
});
