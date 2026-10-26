// Avaliar, desfazer e salvar limites contra Postgres de verdade.
//
// Os testes de banco compartilham UM branch e DELETE é proibido: `reviews` e a
// fila já têm linhas de outros arquivos. Por isso nada aqui conta `reviews`,
// a fila ou o painel inteiros:
//
//  - cada teste semeia o PRÓPRIO card e afirma sobre as linhas de `reviews`
//    daquele `cardId`, e sobre a linha do card por id;
//  - o desfazer age sobre a última avaliação efetiva GLOBAL, e o arquivo roda
//    em série depois dos outros, então a avaliação feita no teste é sempre a
//    mais nova (a base é `reviewedAt` do banco, nunca semeado no futuro); cada
//    teste confere que o card devolvido é o seu, para a causa aparecer se esse
//    pressuposto cair;
//  - `saveLimits` grava a linha única de `settings` (permanente); os testes
//    restauram os padrões 20/200 num `finally`, porque `fetchQueue` lê dali;
//  - os cards semeados são arquivados no `afterAll` (UPDATE, não DELETE).

import { randomUUID } from "node:crypto";

import { asc, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { SETTINGS_ID, cards, reviews, settings } from "@/db/schema";
import { revalidacoes } from "@/db/test-support/next-cache";
import { semearAula, semearCard, semearNota } from "@/shared/test-seed";

import { rateCard, saveLimits, undoLast } from "./actions";
import { fetchUndoTarget } from "./queries";

// `fetchUndoTarget` passa direto para a real, salvo quando o teste do desfazer
// duplo planta um alvo velho. É o que reproduz, de forma determinística, a
// corrida em que dois pedidos leem o mesmo alvo antes de qualquer um gravar.
const planta = vi.hoisted(() => ({
  alvo: undefined as
    | Awaited<ReturnType<typeof import("./queries").fetchUndoTarget>>
    | undefined,
}));

vi.mock("./queries", async (importOriginal) => {
  const real = await importOriginal<typeof import("./queries")>();
  return {
    ...real,
    fetchUndoTarget: vi.fn(async () =>
      planta.alvo === undefined ? real.fetchUndoTarget() : planta.alvo,
    ),
  };
});

const criados: string[] = [];

/** Estado FSRS com um valor diferente em cada coluna: troca de mapeamento aparece. */
const ESTADO = {
  state: "review",
  due: new Date("2026-02-01T10:00:00Z"),
  fsrs: {
    stability: 7.25,
    difficulty: 5.5,
    reps: 9,
    lapses: 2,
    learningSteps: 3,
    elapsedDays: 11,
    scheduledDays: 13,
    lastReview: new Date("2026-01-20T08:30:00Z"),
  },
} as const;

async function novoCard(
  opcoes: Parameters<typeof semearCard>[1] = {},
): Promise<string> {
  const { lessonId } = await semearAula();
  const { noteId } = await semearNota(lessonId);
  const { cardId } = await semearCard(noteId, opcoes);
  criados.push(cardId);
  return cardId;
}

const cardPorId = (id: string) =>
  db.query.cards.findFirst({ where: eq(cards.id, id) });

const revisoesDe = (cardId: string) =>
  db
    .select()
    .from(reviews)
    .where(eq(reviews.cardId, cardId))
    .orderBy(asc(reviews.reviewedAt));

const linhaDeSettings = () =>
  db.select().from(settings).where(eq(settings.id, SETTINGS_ID));

async function restaurarPadroes(): Promise<void> {
  // Não há DELETE: devolve os padrões, que é o que uma linha "neutra" diz.
  const padroes = { newPerDay: 20, reviewsPerDay: 200, updatedAt: new Date() };
  await db
    .insert(settings)
    .values({ id: SETTINGS_ID, ...padroes })
    .onConflictDoUpdate({ target: settings.id, set: padroes });
}

function formulario(valores: Record<string, string>): FormData {
  const f = new FormData();
  for (const [chave, valor] of Object.entries(valores)) f.set(chave, valor);
  return f;
}

afterEach(() => {
  planta.alvo = undefined;
  vi.restoreAllMocks();
});

afterAll(async () => {
  // Cards vencidos no passado ficariam na fila global dos arquivos seguintes.
  if (criados.length === 0) return;
  await db
    .update(cards)
    .set({ archivedAt: new Date() })
    .where(inArray(cards.id, criados));
});

describe("avaliar (rateCard)", () => {
  it("rateCard grava a revisão, avança o card e devolve dueAt", async () => {
    const cardId = await novoCard(ESTADO);
    const antes = await cardPorId(cardId);

    const r = await rateCard({ cardId, rating: "good", durationMs: 4200 });

    expect(r.ok).toBe(true);
    const depois = await cardPorId(cardId);
    // Uma linha nova, para este card (a tabela inteira tem linhas de outros).
    const linhas = await revisoesDe(cardId);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      rating: "good",
      durationMs: 4200,
      undoesReviewId: null,
    });
    expect(depois?.due.getTime()).toBeGreaterThan(Date.now());
    expect(depois?.due.getTime()).toBeGreaterThan(antes?.due.getTime() ?? 0);
    if (r.ok) expect(r.dueAt).toBe(depois?.due.toISOString());
    // O resultado da avaliação também ficou no histórico.
    expect(linhas[0]?.dueAfter).toEqual(depois?.due);
    expect(depois?.reps).toBe(10);
    // Colunas de resultado: o que a avaliação decidiu, igual ao que o card
    // recebeu, e distintas entre si para que uma troca apareça.
    expect(
      depois?.scheduledDays,
      "Premissa do teste, não regressão da produção: se isto falhar, o FSRS passou a devolver scheduledDays igual a elapsedDays e as duas asserções seguintes deixaram de discriminar a troca de colunas. Ajuste o ESTADO semeado.",
    ).not.toBe(depois?.elapsedDays);
    expect(linhas[0]?.scheduledDays).toBe(depois?.scheduledDays);
    expect(linhas[0]?.elapsedDays).toBe(depois?.elapsedDays);
    expect(revalidacoes).toEqual([{ path: "/" }, { path: "/review" }]);
  });

  it("rateCard guarda o estado anterior completo", async () => {
    const cardId = await novoCard(ESTADO);

    const r = await rateCard({ cardId, rating: "hard" });

    expect(r.ok).toBe(true);
    const [linha] = await revisoesDe(cardId);
    // As 10 colunas `*Before`, cada uma com um valor próprio: uma troca de
    // mapeamento entre duas delas (ex.: lapses <-> learningSteps) quebra aqui.
    expect(linha).toMatchObject({
      stateBefore: "review",
      stabilityBefore: 7.25,
      difficultyBefore: 5.5,
      dueBefore: new Date("2026-02-01T10:00:00Z"),
      lastReviewBefore: new Date("2026-01-20T08:30:00Z"),
      repsBefore: 9,
      lapsesBefore: 2,
      learningStepsBefore: 3,
      elapsedDaysBefore: 11,
      scheduledDaysBefore: 13,
    });
  });

  // Borda da única coluna `*Before` anulável: card nunca revisado.
  it("rateCard grava lastReviewBefore nulo quando o card nunca foi revisado", async () => {
    const cardId = await novoCard();

    const r = await rateCard({ cardId, rating: "good" });

    expect(r.ok).toBe(true);
    const [linha] = await revisoesDe(cardId);
    expect(linha?.lastReviewBefore).toBeNull();
    expect(linha).toMatchObject({
      stateBefore: "new",
      repsBefore: 0,
      lapsesBefore: 0,
    });
    // E a avaliação deixou o card com `lastReview` preenchido.
    expect((await cardPorId(cardId))?.lastReview).not.toBeNull();
  });

  it("rateCard com rating inválido devolve mensagem legível e não grava", async () => {
    const cardId = await novoCard(ESTADO);
    const antes = await cardPorId(cardId);

    const r = await rateCard({ cardId, rating: "excelente" });

    expect(r).toEqual({ ok: false, message: "Avaliação inválida." });
    expect(await revisoesDe(cardId)).toHaveLength(0);
    expect(await cardPorId(cardId)).toEqual(antes);
    expect(revalidacoes).toHaveLength(0);
  });

  it("rateCard com cardId inexistente devolve ok: false", async () => {
    const cardId = randomUUID();

    const r = await rateCard({ cardId, rating: "good" });

    expect(r).toEqual({ ok: false, message: "Card não encontrado." });
    expect(await revisoesDe(cardId)).toHaveLength(0);
  });
});

describe("desfazer (undoLast)", () => {
  // O ramo "sem histórico" (`ok: false`, "Nada para desfazer.") não é
  // alcançável com dados reais: `undoLast()` desfaz a última avaliação efetiva
  // GLOBAL, o branch é compartilhado, `reviews` nunca está vazia e DELETE é
  // proibido. Mas é alcançável plantando `null` em `planta.alvo`, que o mock
  // de `fetchUndoTarget` devolve no lugar da consulta real — e é isso que o
  // teste "undoLast sem alvo" faz.
  it("undoLast reconstrói o card e insere a linha de reversão", async () => {
    const cardId = await novoCard(ESTADO);
    const original = await cardPorId(cardId);
    await rateCard({ cardId, rating: "good" });
    const aposAvaliar = await cardPorId(cardId);
    expect(aposAvaliar?.reps).toBe(10);

    const r = await undoLast();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Pressuposto do arquivo: a avaliação acima é a mais nova do branch.
    expect(r.card.id).toBe(cardId);
    // A avaliação feita antes também revalidou; o desfazer acrescentou o par.
    expect(revalidacoes).toEqual([
      { path: "/" },
      { path: "/review" },
      { path: "/" },
      { path: "/review" },
    ]);
    // Todas as colunas do card voltaram aos valores semeados.
    expect(await cardPorId(cardId)).toEqual(original);
    expect(r.card).toMatchObject({
      id: cardId,
      state: "review",
      due: ESTADO.due,
      stability: 7.25,
      difficulty: 5.5,
      reps: 9,
      lapses: 2,
      learningSteps: 3,
      elapsedDays: 11,
      scheduledDays: 13,
      lastReview: ESTADO.fsrs.lastReview,
    });

    // Desfazer insere, nunca apaga: duas linhas, a segunda aponta para a primeira.
    const linhas = await revisoesDe(cardId);
    expect(linhas).toHaveLength(2);
    const avaliacao = linhas.find((l) => l.undoesReviewId === null);
    const reversao = linhas.find((l) => l.undoesReviewId !== null);
    expect(avaliacao).toBeDefined();
    expect(reversao?.undoesReviewId).toBe(avaliacao?.id);
    // A reversão descreve a própria transição: o "antes" é o card como a
    // avaliação o deixou, o "depois" é o estado restaurado.
    expect(reversao).toMatchObject({
      stateBefore: aposAvaliar?.state,
      stabilityBefore: aposAvaliar?.stability,
      difficultyBefore: aposAvaliar?.difficulty,
      dueBefore: aposAvaliar?.due,
      lastReviewBefore: aposAvaliar?.lastReview,
      repsBefore: aposAvaliar?.reps,
      lapsesBefore: aposAvaliar?.lapses,
      learningStepsBefore: aposAvaliar?.learningSteps,
      elapsedDaysBefore: aposAvaliar?.elapsedDays,
      scheduledDaysBefore: aposAvaliar?.scheduledDays,
      dueAfter: ESTADO.due,
      scheduledDays: 13,
      elapsedDays: 11,
    });
  });

  it("undoLast sem alvo devolve ok: false", async () => {
    planta.alvo = null;

    const r = await undoLast();

    expect(r).toEqual({ ok: false, message: "Nada para desfazer." });
    // Sem alvo não há o que revalidar: nada mudou.
    expect(revalidacoes).toHaveLength(0);
  });

  it("a mesma avaliação não pode ser desfeita duas vezes", async () => {
    // Sequencialmente, o 2º `undoLast` acharia OUTRA avaliação (a efetiva
    // anterior do branch) e a desfaria com sucesso. O índice único só é
    // alcançado pela corrida: dois pedidos leem o mesmo alvo antes de qualquer
    // um gravar. Reproduzida aqui plantando o alvo velho no 2º pedido; o
    // INSERT que falha é o do Postgres de verdade, sem mock de driver.
    const cardId = await novoCard(ESTADO);
    await rateCard({ cardId, rating: "good" });
    const alvoVelho = await fetchUndoTarget();
    expect(alvoVelho?.card.id).toBe(cardId);

    const primeiro = await undoLast();
    expect(primeiro.ok).toBe(true);

    planta.alvo = alvoVelho;
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const segundo = await undoLast();

    expect(segundo).toEqual({
      ok: false,
      message: "Não foi possível desfazer agora. Tente de novo.",
    });
    // A falha veio do banco: violação de `reviews_undoes_idx` (código e constraint abaixo).
    expect(erro).toHaveBeenCalledOnce();
    // O `db.batch` do driver HTTP do Neon lança o erro do Postgres sem embrulho.
    expect(erro.mock.calls[0]?.[0]).toMatchObject({
      code: "23505",
      constraint: "reviews_undoes_idx",
    });
    // A falha do 2º pedido não revalida: só o rateCard e o 1º desfazer o fizeram.
    expect(revalidacoes).toHaveLength(4);
    // Uma avaliação, uma reversão: a segunda não deixou linha.
    const linhas = await revisoesDe(cardId);
    expect(linhas).toHaveLength(2);
    expect(
      linhas.filter((l) => l.undoesReviewId === alvoVelho?.reviewId),
    ).toHaveLength(1);
  });
});

describe("limites (saveLimits)", () => {
  it("saveLimits grava a linha única de settings", async () => {
    try {
      const r = await saveLimits(
        { ok: true },
        formulario({ newPerDay: "7", reviewsPerDay: "70" }),
      );

      expect(r).toEqual({ ok: true });
      expect(revalidacoes).toEqual([{ path: "/" }, { path: "/review" }]);
      const linhas = await linhaDeSettings();
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({ newPerDay: 7, reviewsPerDay: 70 });

      // Gravar de novo atualiza a mesma linha, não cria outra.
      await saveLimits(
        { ok: true },
        formulario({ newPerDay: "8", reviewsPerDay: "80" }),
      );
      const depois = await linhaDeSettings();
      expect(depois).toHaveLength(1);
      expect(depois[0]).toMatchObject({ newPerDay: 8, reviewsPerDay: 80 });
    } finally {
      await restaurarPadroes();
    }
  });

  it("saveLimits recusa valor fora da faixa com mensagem legível", async () => {
    try {
      // Base conhecida, para provar que a recusa não toca na linha.
      await saveLimits(
        { ok: true },
        formulario({ newPerDay: "5", reviewsPerDay: "50" }),
      );
      const antes = await linhaDeSettings();

      const alto = await saveLimits(
        { ok: true },
        formulario({ newPerDay: "1000", reviewsPerDay: "50" }),
      );
      const texto = await saveLimits(
        { ok: true },
        formulario({ newPerDay: "5", reviewsPerDay: "abc" }),
      );

      expect(alto).toEqual({
        ok: false,
        message: "Novos por dia: o máximo é 999.",
      });
      expect(texto).toEqual({
        ok: false,
        message: "Revisões por dia: use um número inteiro de 0 a 9999.",
      });
      expect(await linhaDeSettings()).toEqual(antes);
      // Só a gravação de base (5/50) revalidou; as duas recusas não.
      expect(revalidacoes).toEqual([{ path: "/" }, { path: "/review" }]);
    } finally {
      await restaurarPadroes();
    }
  });
});
