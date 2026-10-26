// Leituras da revisão contra Postgres de verdade, com o relógio injetado.
//
// Os testes de banco compartilham UM branch, e os arquivos anteriores deixam
// cards vencidos na fila global (e a regra do projeto proíbe DELETE). Por isso:
//
//  - nada aqui conta a fila ou o painel inteiros; afirma-se sobre os cards
//    semeados, filtrando por id, ou sobre a DIFERENÇA que o dado semeado causa;
//  - o corte por limite diz quanto já foi estudado no dia consultando o banco
//    com um instante literal (`novosEstudadosDesde`), e não pela produção;
//  - os testes que precisam de um "mundo vazio" usam um relógio num ano em que
//    nenhum outro arquivo escreve (2001, 2002, 2003). Os dados que ficam para
//    trás são datados no passado, onde `gte(reviewedAt, dayStart(agora))` de um
//    relógio real nunca os alcança, e os cards são arquivados no `afterAll`.

import { and, eq, gte, inArray, isNull, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { SETTINGS_ID, cards, reviews, settings } from "@/db/schema";
import {
  semearAula,
  semearCard,
  semearNota,
  semearRevisao,
  type OpcoesCard,
} from "@/shared/test-seed";

import { CORTE_HORAS } from "./day";
import {
  fetchAheadQueue,
  fetchLimits,
  fetchPanel,
  fetchQueue,
  fetchTodayLabel,
  fetchUndoTarget,
} from "./queries";

/** Limites tão folgados que nunca cortam: o teste quer ver o filtro, não o corte. */
const FOLGADOS = { newPerDay: 1_000_000, reviewsPerDay: 1_000_000 };

/** Terça, 11h em São Paulo; o dia lógico começou às 04h (07:00Z) do mesmo dia. */
const AGORA = new Date("2026-03-10T14:00:00Z");
const INICIO_DO_DIA = new Date("2026-03-10T07:00:00Z");

const criados: string[] = [];

/** Semeia um card e o registra para ser arquivado ao fim do arquivo. */
async function card(noteId: string, opcoes: OpcoesCard = {}): Promise<string> {
  const { cardId } = await semearCard(noteId, opcoes);
  criados.push(cardId);
  return cardId;
}

async function novaNota(): Promise<string> {
  const { lessonId } = await semearAula();
  const { noteId } = await semearNota(lessonId);
  return noteId;
}

/**
 * Quantos cards novos já foram estudados desde `inicio`, direto do banco. É o
 * `F` que a produção desconta do limite; medi-lo aqui, com um instante
 * literal, é o que deixa o teste do corte independente do que outros arquivos
 * gravaram.
 */
async function novosEstudadosDesde(inicio: Date): Promise<number> {
  const revertida = alias(reviews, "revertida");
  const [linha] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(reviews)
    .where(
      and(
        gte(reviews.reviewedAt, inicio),
        eq(reviews.stateBefore, "new"),
        isNull(reviews.undoesReviewId),
        notExists(
          db
            .select({ um: sql`1` })
            .from(revertida)
            .where(eq(revertida.undoesReviewId, reviews.id)),
        ),
      ),
    );
  return linha?.n ?? 0;
}

const ids = (fila: { cards: { id: string }[] }): string[] =>
  fila.cards.map((c) => c.id);

const novosNaFila = (fila: { cards: { state: string }[] }): number =>
  fila.cards.filter((c) => c.state === "new").length;

afterAll(async () => {
  // Cards vencidos no passado ficariam eternamente na fila global dos arquivos
  // seguintes. Arquivar é UPDATE, não DELETE.
  if (criados.length === 0) return;
  await db
    .update(cards)
    .set({ archivedAt: new Date() })
    .where(inArray(cards.id, criados));
});

describe("fila do dia (fetchQueue)", () => {
  it("fetchQueue traz o card vencido e deixa o que vence amanhã", async () => {
    const noteId = await novaNota();
    const vencido = await card(noteId, {
      state: "review",
      due: new Date("2026-03-09T14:00:00Z"),
    });
    // 14h de amanhã: depois do fim do dia lógico (amanhã 07:00Z).
    const amanha = await card(noteId, {
      state: "review",
      due: new Date("2026-03-11T14:00:00Z"),
    });
    const depoisDeAmanha = await card(noteId, {
      state: "review",
      due: new Date("2026-03-12T14:00:00Z"),
    });

    const fila = ids(await fetchQueue(AGORA, FOLGADOS));

    expect(fila).toContain(vencido);
    expect(fila).not.toContain(amanha);
    expect(fila).not.toContain(depoisDeAmanha);
  });

  it("fetchQueue traz o que vence mais tarde hoje, antes do corte das 4h", async () => {
    const noteId = await novaNota();
    // 02h30 de amanhã em São Paulo ainda é o dia lógico de hoje.
    const hojeTarde = await card(noteId, {
      state: "review",
      due: new Date("2026-03-11T05:30:00Z"),
    });
    // 04h30 de amanhã já é outro dia.
    const amanhaCedo = await card(noteId, {
      state: "review",
      due: new Date("2026-03-11T07:30:00Z"),
    });

    const fila = ids(await fetchQueue(AGORA, FOLGADOS));

    expect(fila).toContain(hojeTarde);
    expect(fila).not.toContain(amanhaCedo);
  });

  it("fetchQueue não traz card suspenso nem arquivado", async () => {
    const noteId = await novaNota();
    const due = new Date("2026-03-09T14:00:00Z");
    const normal = await card(noteId, { state: "review", due });
    const suspenso = await card(noteId, {
      state: "review",
      due,
      suspended: true,
    });
    const arquivado = await card(noteId, {
      state: "review",
      due,
      archivedAt: new Date("2026-03-01T00:00:00Z"),
    });
    const novoSuspenso = await card(noteId, { suspended: true });

    const fila = ids(await fetchQueue(AGORA, FOLGADOS));

    expect(fila).toContain(normal);
    expect(fila).not.toContain(suspenso);
    expect(fila).not.toContain(arquivado);
    expect(fila).not.toContain(novoSuspenso);
  });

  it("fetchQueue devolve o caminho 'Curso · Aula' do card", async () => {
    const { lessonId } = await semearAula({
      courseTitle: "Cálculo",
      lessonTitle: "Limites",
    });
    const { noteId } = await semearNota(lessonId);
    const id = await card(noteId, {
      state: "review",
      due: new Date("2026-03-09T14:00:00Z"),
      prompt: "Pergunta do caminho",
    });

    const fila = await fetchQueue(AGORA, FOLGADOS);
    const achado = fila.cards.find((c) => c.id === id);

    expect(achado?.path).toBe("Cálculo · Limites");
    expect(achado?.prompt).toBe("Pergunta do caminho");
  });

  it("fetchQueue respeita o limite de novos por dia", async () => {
    const noteId = await novaNota();
    await card(noteId);
    await card(noteId);
    await card(noteId);

    // Já existem cards novos de outros arquivos e talvez estudos do dia: o
    // limite de `F + 2` deixa exatamente 2 vagas, seja qual for o `F`.
    const feitos = await novosEstudadosDesde(INICIO_DO_DIA);
    const fila = await fetchQueue(AGORA, {
      newPerDay: feitos + 2,
      reviewsPerDay: FOLGADOS.reviewsPerDay,
    });

    expect(novosNaFila(fila)).toBe(2);
  });

  it("fetchQueue desconta do limite o que já foi estudado hoje", async () => {
    const noteId = await novaNota();
    const estudado = await card(noteId);
    await card(noteId);
    await card(noteId);

    const feitos = await novosEstudadosDesde(INICIO_DO_DIA);
    const limites = {
      newPerDay: feitos + 2,
      reviewsPerDay: FOLGADOS.reviewsPerDay,
    };
    expect(novosNaFila(await fetchQueue(AGORA, limites))).toBe(2);

    // Estudou um novo hoje: reabrir o /review não devolve a vaga.
    await semearRevisao(estudado, {
      reviewedAt: new Date("2026-03-10T12:00:00Z"),
    });

    expect(novosNaFila(await fetchQueue(AGORA, limites))).toBe(1);
  });

  it("fetchQueue com fila vazia diz em quantos dias vence o próximo", async () => {
    // Relógio em 2001: nenhum outro arquivo escreve ali, então o card mais
    // próximo depois do fim do dia é o semeado aqui.
    const agora = new Date("2001-01-01T14:00:00Z");
    const noteId = await novaNota();
    await card(noteId, {
      state: "review",
      due: new Date("2001-01-04T14:00:00Z"),
    });

    // Limites zero esvaziam a fila sem depender do que existe no branch.
    const fila = await fetchQueue(agora, { newPerDay: 0, reviewsPerDay: 0 });

    expect(fila.cards).toEqual([]);
    expect(fila.nextDueInDays).toBe(3);
  });

  it("o corte do dia é às 4h: card de 23h50 conta no dia anterior", async () => {
    expect(CORTE_HORAS).toBe(4);
    const hora = (n: number) => String(n).padStart(2, "0");
    // 02h em São Paulo, dois antes do corte: ainda é o dia lógico anterior.
    const agora = new Date(`2026-03-10T${hora(CORTE_HORAS - 2)}:00:00-03:00`);
    const inicio = new Date(`2026-03-09T${hora(CORTE_HORAS)}:00:00-03:00`);

    const noteId = await novaNota();
    const tarde = await card(noteId);
    const cedo = await card(noteId);
    await card(noteId);

    const feitos = await novosEstudadosDesde(inicio);
    const limites = {
      newPerDay: feitos + 2,
      reviewsPerDay: FOLGADOS.reviewsPerDay,
    };
    expect(novosNaFila(await fetchQueue(agora, limites))).toBe(2);

    // 23h50 do dia 9: mesmo dia lógico do relógio, então gasta uma vaga.
    await semearRevisao(tarde, {
      reviewedAt: new Date("2026-03-09T23:50:00-03:00"),
    });
    // 03h50 do dia 9: antes do corte, pertence ao dia 8 e não gasta vaga.
    await semearRevisao(cedo, {
      reviewedAt: new Date(`2026-03-09T${hora(CORTE_HORAS - 1)}:50:00-03:00`),
    });

    expect(novosNaFila(await fetchQueue(agora, limites))).toBe(1);
  });
});

describe("estudar adiantado (fetchAheadQueue)", () => {
  it("fetchAheadQueue oferece os próximos a vencer, até 20, sem mexer nos limites", async () => {
    // Relógio em 2002: os 22 cards abaixo são os mais próximos de todo o branch.
    const agora = new Date("2002-01-01T14:00:00Z");
    const noteId = await novaNota();
    const semeados: string[] = [];
    for (let dia = 0; dia < 22; dia += 1) {
      semeados.push(
        await card(noteId, {
          state: "review",
          due: new Date(Date.UTC(2002, 0, 5 + dia, 12)),
        }),
      );
    }

    const fila = await fetchAheadQueue(agora);

    expect(ids(fila)).toEqual(semeados.slice(0, 20));
    // O primeiro vence em 2002-01-05: quatro dias lógicos adiante.
    expect(fila.nextDueInDays).toBe(4);
  });

  it("fetchAheadQueue não oferece o que já venceu hoje, o suspenso nem o arquivado", async () => {
    const agora = new Date("2002-06-01T14:00:00Z");
    const noteId = await novaNota();
    const adiante = new Date("2002-06-05T12:00:00Z");
    const ok = await card(noteId, { state: "review", due: adiante });
    const venceHoje = await card(noteId, {
      state: "review",
      due: new Date("2002-06-01T20:00:00Z"),
    });
    const suspenso = await card(noteId, {
      state: "review",
      due: adiante,
      suspended: true,
    });
    const arquivado = await card(noteId, {
      state: "review",
      due: adiante,
      archivedAt: new Date("2002-05-01T00:00:00Z"),
    });

    const fila = ids(await fetchAheadQueue(agora));

    expect(fila).toContain(ok);
    expect(fila).not.toContain(venceHoje);
    expect(fila).not.toContain(suspenso);
    expect(fila).not.toContain(arquivado);
  });
});

describe("limites (fetchLimits)", () => {
  it("fetchLimits devolve os padrões do SPEC §4 sem linha em settings", async (ctx) => {
    // `settings` tem uma linha só e não se apaga. Se outro arquivo gravou
    // antes, o estado "sem linha" já não existe neste branch.
    const existentes = await db.select().from(settings);
    if (existentes.length > 0) {
      ctx.skip(
        "settings já tem linha (gravada por outro arquivo); o estado 'sem linha' só existe se este arquivo rodar antes de quem grava.",
      );
    }

    expect(await fetchLimits()).toEqual({ newPerDay: 20, reviewsPerDay: 200 });
  });

  it("fetchLimits lê a linha gravada", async () => {
    const valores = { newPerDay: 7, reviewsPerDay: 70, updatedAt: new Date() };
    try {
      await db
        .insert(settings)
        .values({ id: SETTINGS_ID, ...valores })
        .onConflictDoUpdate({ target: settings.id, set: valores });

      expect(await fetchLimits()).toEqual({ newPerDay: 7, reviewsPerDay: 70 });
    } finally {
      // Não há DELETE: devolve os padrões, que é o que uma linha "neutra" diz.
      const padroes = {
        newPerDay: 20,
        reviewsPerDay: 200,
        updatedAt: new Date(),
      };
      await db
        .insert(settings)
        .values({ id: SETTINGS_ID, ...padroes })
        .onConflictDoUpdate({ target: settings.id, set: padroes });
    }
  });
});

describe("painel (fetchPanel)", () => {
  it("fetchPanel conta vencidos, novos, streak e mediana", async () => {
    // Relógio em 2003: o streak só enxerga os dias semeados aqui. Vencidos e
    // novos saem por diferença, porque o branch já tem cards de outros arquivos.
    const agora = new Date("2003-05-10T14:00:00Z");
    const antes = await fetchPanel(agora, FOLGADOS);

    const noteId = await novaNota();
    const ontem = new Date("2003-05-09T14:00:00Z");
    await card(noteId, { state: "review", due: ontem });
    // Mais tarde hoje (20h, antes do corte das 4h): ainda vence hoje.
    await card(noteId, {
      state: "review",
      due: new Date("2003-05-10T23:00:00Z"),
    });
    // Fora: vence amanhã, suspenso, arquivado.
    await card(noteId, {
      state: "review",
      due: new Date("2003-05-11T14:00:00Z"),
    });
    await card(noteId, { state: "review", due: ontem, suspended: true });
    await card(noteId, {
      state: "review",
      due: ontem,
      archivedAt: new Date("2003-05-01T00:00:00Z"),
    });
    const novoA = await card(noteId);
    await card(noteId);
    await card(noteId, { suspended: true });

    // Estudou em 10, 9, 8 e 6 de maio: o dia 7 quebra a sequência em 3.
    const dias = [
      ["2003-05-10T12:00:00Z", 1000],
      ["2003-05-09T12:00:00Z", 3000],
      ["2003-05-08T12:00:00Z", 5000],
      ["2003-05-06T12:00:00Z", 100000],
    ] as const;
    for (const [quando, durationMs] of dias) {
      await semearRevisao(novoA, {
        reviewedAt: new Date(quando),
        durationMs,
      });
    }
    // Sem duração medida: fora da mediana, não vira zero.
    await semearRevisao(novoA, { reviewedAt: new Date("2003-05-10T13:00:00Z") });
    // Desfeita: nem a avaliação nem a reversão entram na mediana.
    const desfeita = await semearRevisao(novoA, {
      reviewedAt: new Date("2003-05-10T11:00:00Z"),
      durationMs: 999_999,
    });
    await semearRevisao(novoA, {
      reviewedAt: new Date("2003-05-10T11:01:00Z"),
      undoesReviewId: desfeita.reviewId,
      durationMs: 888_888,
    });

    const depois = await fetchPanel(agora, FOLGADOS);

    expect(depois.dueToday - antes.dueToday).toBe(2);
    expect(depois.newAvailable - antes.newAvailable).toBe(2);
    expect(depois.queueSize - antes.queueSize).toBe(4);
    expect(depois.streakDays).toBe(3);

    // Mediana de todas as avaliações efetivas com duração, calculada aqui.
    const revertida = alias(reviews, "revertida");
    const medidas = await db
      .select({ ms: reviews.durationMs })
      .from(reviews)
      .where(
        and(
          sql`${reviews.durationMs} is not null`,
          isNull(reviews.undoesReviewId),
          notExists(
            db
              .select({ um: sql`1` })
              .from(revertida)
              .where(eq(revertida.undoesReviewId, reviews.id)),
          ),
        ),
      );
    const ordenadas = medidas
      .map((m) => m.ms ?? 0)
      .sort((x, y) => x - y);
    const meio = ordenadas.length / 2;
    const esperada =
      ordenadas.length % 2 === 1
        ? (ordenadas[Math.floor(meio)] ?? 0)
        : ((ordenadas[meio - 1] ?? 0) + (ordenadas[meio] ?? 0)) / 2;

    expect(depois.medianMs).toBe(esperada);
  });

  it("fetchPanel ignora os dois lados de um par desfeito", async () => {
    const antes = await fetchPanel(AGORA, FOLGADOS);

    const noteId = await novaNota();
    const desfeito = await card(noteId);
    const mantido = await card(noteId);
    const original = await semearRevisao(desfeito, {
      reviewedAt: new Date("2026-03-10T12:00:00Z"),
    });
    await semearRevisao(desfeito, {
      reviewedAt: new Date("2026-03-10T12:30:00Z"),
      undoesReviewId: original.reviewId,
    });
    // Uma avaliação solta, para provar que o filtro não zera tudo.
    await semearRevisao(mantido, {
      reviewedAt: new Date("2026-03-10T13:00:00Z"),
    });

    const depois = await fetchPanel(AGORA, FOLGADOS);

    // O par soma 0 (e não 1 ou 2); a avaliação solta soma 1.
    expect(depois.doneToday - antes.doneToday).toBe(1);
  });
});

describe("desfazer e data", () => {
  it("fetchUndoTarget devolve a última avaliação efetiva", async () => {
    const { lessonId } = await semearAula({
      courseTitle: "Física",
      lessonTitle: "Cinemática",
    });
    const { noteId } = await semearNota(lessonId);
    const alvo = await card(noteId, { state: "review" });
    const desfeito = await card(noteId, { state: "review" });
    const dueBefore = new Date("2026-03-01T10:00:00Z");
    const dueAfter = new Date("2026-03-20T10:00:00Z");

    // Sem `reviewedAt`: vale o relógio do banco, que anda para frente a cada
    // INSERT. Assim estas linhas são mais novas que qualquer outra do branch.
    const efetiva = await semearRevisao(alvo, {
      rating: "hard",
      antes: {
        state: "review",
        stability: 3.5,
        difficulty: 4.25,
        due: dueBefore,
        reps: 5,
        lapses: 1,
        scheduledDays: 6,
      },
      depois: { scheduledDays: 19, elapsedDays: 2, dueAfter },
    });
    const revertida = await semearRevisao(desfeito, { rating: "easy" });
    // A reversão é a linha mais nova de todas; o alvo tem de pular as duas.
    await semearRevisao(desfeito, {
      rating: "again",
      undoesReviewId: revertida.reviewId,
    });

    const alvoDoDesfazer = await fetchUndoTarget();

    expect(alvoDoDesfazer?.reviewId).toBe(efetiva.reviewId);
    expect(alvoDoDesfazer?.card.id).toBe(alvo);
    expect(alvoDoDesfazer?.card.path).toBe("Física · Cinemática");
    expect(alvoDoDesfazer?.log).toMatchObject({
      rating: "hard",
      stateBefore: "review",
      stabilityBefore: 3.5,
      difficultyBefore: 4.25,
      dueBefore,
      repsBefore: 5,
      lapsesBefore: 1,
      scheduledDaysBefore: 6,
      scheduledDays: 19,
      elapsedDays: 2,
      dueAfter,
    });
  });

  it("fetchTodayLabel formata a data do painel", () => {
    expect(fetchTodayLabel(AGORA)).toBe("Terça-feira, 10 de março");
    // 02h de São Paulo ainda é o dia lógico anterior.
    expect(fetchTodayLabel(new Date("2026-03-10T05:00:00Z"))).toBe(
      "Segunda-feira, 9 de março",
    );
  });
});
