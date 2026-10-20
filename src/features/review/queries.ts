// Leituras da revisão: a fila do dia e os números do painel.
//
// A ponte entre o banco e os módulos puros. Nenhuma regra de agendamento mora
// aqui: a consulta traz os candidatos, `queueFor` decide a ordem e o corte.

import { and, eq, gte, isNull, lte, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { cards, notes, reviews } from "@/db/schema";

import { CORTE_HORAS, FUSO, dayEnd, dayStart, daysUntil, logicalDay, streak } from "./day";
import {
  DEFAULT_LIMITS,
  queueFor,
  type CardState,
  type Limits,
  type Rating,
  type ReviewLog,
} from "./scheduler";

/* ─────────────────────── o que conta como revisão ────────────────────── */

const revertida = alias(reviews, "revertida");

/**
 * Uma avaliação "de verdade": não é reversão de outra e não foi desfeita.
 * Todo número do painel passa por aqui — senão um card revisado e desfeito
 * apareceria como dois estudos do dia.
 */
const efetiva = and(
  isNull(reviews.undoesReviewId),
  notExists(
    db
      .select({ um: sql`1` })
      .from(revertida)
      .where(eq(revertida.undoesReviewId, reviews.id)),
  ),
);

/** Dia lógico de `reviewed_at` calculado no banco, com o mesmo corte do app. */
const diaLogico = sql<string>`to_char((${reviews.reviewedAt} - interval '${sql.raw(String(CORTE_HORAS))} hours') at time zone ${FUSO}, 'YYYY-MM-DD')`;

/* ──────────────────────────────── fila ───────────────────────────────── */

export type QueueCard = CardState & {
  kind: "cloze" | "qa";
  prompt: string;
  answer: string;
  hint: string | null;
  noteId: string;
  noteTitle: string;
};

export type Queue = {
  cards: QueueCard[];
  /** Em quantos dias vence o próximo, quando a fila está vazia. */
  nextDueInDays: number | null;
};

/** Candidatos: fora da fila só fica o arquivado, o suspenso e o que não venceu. */
async function candidatos(now: Date): Promise<QueueCard[]> {
  const rows = await db
    .select({
      id: cards.id,
      kind: cards.kind,
      prompt: cards.prompt,
      answer: cards.answer,
      hint: cards.hint,
      noteId: cards.noteId,
      noteTitle: notes.title,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      learningSteps: cards.learningSteps,
      reps: cards.reps,
      lapses: cards.lapses,
      state: cards.state,
      lastReview: cards.lastReview,
    })
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .where(
      and(
        isNull(cards.archivedAt),
        eq(cards.suspended, false),
        or(eq(cards.state, "new"), lte(cards.due, dayEnd(now))),
      ),
    )
    // novos na ordem da nota; vencidos o `queueFor` reordena por vencimento
    .orderBy(cards.noteId, cards.ordinal);

  return rows;
}

/**
 * A fila de agora. Os limites do dia descontam o que já foi estudado hoje:
 * reabrir o `/review` depois de 20 cards novos não oferece outros 20.
 */
export async function fetchQueue(limits: Limits = DEFAULT_LIMITS): Promise<Queue> {
  const now = new Date();

  const [todos, feitos] = await Promise.all([candidatos(now), countToday(now)]);

  const fila = queueFor(todos, now, {
    newPerDay: limits.newPerDay - feitos.novos,
    reviewsPerDay: limits.reviewsPerDay - feitos.revisoes,
  });

  if (fila.length > 0) return { cards: fila, nextDueInDays: null };

  const proximo = await db
    .select({ due: cards.due })
    .from(cards)
    .where(
      and(
        isNull(cards.archivedAt),
        eq(cards.suspended, false),
        gte(cards.due, dayEnd(now)),
      ),
    )
    .orderBy(cards.due)
    .limit(1);

  const due = proximo[0]?.due;

  return {
    cards: [],
    nextDueInDays: due === undefined ? null : daysUntil(due, now),
  };
}

/** Quantos cards o modo adiantado oferece de uma vez. */
const ADIANTADO_MAX = 20;

/**
 * Estudar adiantado: os próximos a vencer, antes da hora. Não mexe nos
 * limites do dia — é um pedido explícito do usuário, não a fila de hoje.
 */
export async function fetchAheadQueue(): Promise<Queue> {
  const now = new Date();

  const rows = await db
    .select({
      id: cards.id,
      kind: cards.kind,
      prompt: cards.prompt,
      answer: cards.answer,
      hint: cards.hint,
      noteId: cards.noteId,
      noteTitle: notes.title,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      learningSteps: cards.learningSteps,
      reps: cards.reps,
      lapses: cards.lapses,
      state: cards.state,
      lastReview: cards.lastReview,
    })
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .where(
      and(
        isNull(cards.archivedAt),
        eq(cards.suspended, false),
        gte(cards.due, dayEnd(now)),
      ),
    )
    .orderBy(cards.due)
    .limit(ADIANTADO_MAX);

  const proximo = rows[0]?.due;

  return {
    cards: rows,
    nextDueInDays: proximo === undefined ? null : daysUntil(proximo, now),
  };
}

/* ─────────────────────────────── painel ──────────────────────────────── */

export type Panel = {
  /** Cards já vistos que vencem hoje. */
  dueToday: number;
  /** Cards novos esperando a primeira revisão. */
  newAvailable: number;
  /** Quantos ainda cabem hoje, depois dos limites. */
  queueSize: number;
  /** Dias de estudo consecutivos. */
  streakDays: number;
  /** Quantas avaliações válidas aconteceram hoje. */
  doneToday: number;
  nextDueInDays: number | null;
};

async function countToday(
  now: Date,
): Promise<{ novos: number; revisoes: number }> {
  const linhas = await db
    .select({
      novos: sql<number>`count(*) filter (where ${reviews.stateBefore} = 'new')`.mapWith(
        Number,
      ),
      revisoes: sql<number>`count(*) filter (where ${reviews.stateBefore} <> 'new')`.mapWith(
        Number,
      ),
    })
    .from(reviews)
    .where(and(gte(reviews.reviewedAt, dayStart(now)), efetiva));

  return { novos: linhas[0]?.novos ?? 0, revisoes: linhas[0]?.revisoes ?? 0 };
}

export async function fetchPanel(
  limits: Limits = DEFAULT_LIMITS,
): Promise<Panel> {
  const now = new Date();

  const [contagens, feitos, dias, fila] = await Promise.all([
    db
      .select({
        vencem: sql<number>`count(*) filter (where ${cards.state} <> 'new' and ${cards.due} <= ${dayEnd(now)})`.mapWith(
          Number,
        ),
        novos: sql<number>`count(*) filter (where ${cards.state} = 'new')`.mapWith(
          Number,
        ),
      })
      .from(cards)
      .where(and(isNull(cards.archivedAt), eq(cards.suspended, false))),
    countToday(now),
    db.selectDistinct({ dia: diaLogico }).from(reviews).where(efetiva),
    fetchQueue(limits),
  ]);

  return {
    dueToday: contagens[0]?.vencem ?? 0,
    newAvailable: contagens[0]?.novos ?? 0,
    queueSize: fila.cards.length,
    streakDays: streak(
      dias.map((linha) => linha.dia),
      logicalDay(now),
    ),
    doneToday: feitos.novos + feitos.revisoes,
    nextDueInDays: fila.nextDueInDays,
  };
}

/* ───────────────────────────── desfazer ──────────────────────────────── */

export type UndoTarget = {
  reviewId: string;
  card: QueueCard;
  log: ReviewLog;
};

/**
 * A última avaliação que ainda pode ser desfeita, em todo o app — não só na
 * sessão aberta. Assim o `u` funciona depois de um refresh.
 */
export async function fetchUndoTarget(): Promise<UndoTarget | null> {
  const linhas = await db
    .select({
      reviewId: reviews.id,
      rating: reviews.rating,
      stateBefore: reviews.stateBefore,
      stabilityBefore: reviews.stabilityBefore,
      difficultyBefore: reviews.difficultyBefore,
      dueBefore: reviews.dueBefore,
      lastReviewBefore: reviews.lastReviewBefore,
      repsBefore: reviews.repsBefore,
      lapsesBefore: reviews.lapsesBefore,
      learningStepsBefore: reviews.learningStepsBefore,
      elapsedDaysBefore: reviews.elapsedDaysBefore,
      scheduledDaysBefore: reviews.scheduledDaysBefore,
      elapsedDays: reviews.elapsedDays,
      scheduledDays: reviews.scheduledDays,
      dueAfter: reviews.dueAfter,
      card: {
        id: cards.id,
        kind: cards.kind,
        prompt: cards.prompt,
        answer: cards.answer,
        hint: cards.hint,
        noteId: cards.noteId,
        due: cards.due,
        stability: cards.stability,
        difficulty: cards.difficulty,
        elapsedDays: cards.elapsedDays,
        scheduledDays: cards.scheduledDays,
        learningSteps: cards.learningSteps,
        reps: cards.reps,
        lapses: cards.lapses,
        state: cards.state,
        lastReview: cards.lastReview,
      },
      noteTitle: notes.title,
    })
    .from(reviews)
    .innerJoin(cards, eq(cards.id, reviews.cardId))
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .where(efetiva)
    .orderBy(sql`${reviews.reviewedAt} desc`)
    .limit(1);

  const linha = linhas[0];

  if (linha === undefined) return null;

  const rating: Rating = linha.rating;

  return {
    reviewId: linha.reviewId,
    card: { ...linha.card, noteTitle: linha.noteTitle },
    log: {
      rating,
      stateBefore: linha.stateBefore,
      stabilityBefore: linha.stabilityBefore,
      difficultyBefore: linha.difficultyBefore,
      dueBefore: linha.dueBefore,
      lastReviewBefore: linha.lastReviewBefore,
      repsBefore: linha.repsBefore,
      lapsesBefore: linha.lapsesBefore,
      learningStepsBefore: linha.learningStepsBefore,
      elapsedDaysBefore: linha.elapsedDaysBefore,
      scheduledDaysBefore: linha.scheduledDaysBefore,
      elapsedDays: linha.elapsedDays,
      scheduledDays: linha.scheduledDays,
      dueAfter: linha.dueAfter,
    },
  };
}
