// Agendamento — SPEC §4. Invólucro fino sobre `ts-fsrs`: converte a linha de
// `cards` no objeto que a biblioteca espera, chama, e converte de volta.
// Nenhuma regra de FSRS é reimplementada aqui.
//
// Módulo puro: sem banco, sem React. Expõe duas funções, `schedule` e
// `queueFor`, e o log que a primeira produz é exatamente o que vai para a
// tabela `reviews` — inclusive o estado anterior, que o desfazer precisa.

import { fsrs, Rating as FsrsRating, State as FsrsState } from "ts-fsrs";
import type { Card as FsrsCard, Grade } from "ts-fsrs";

import { dayEnd } from "./day";

/* ───────────────────────────────── tipos ──────────────────────────────── */

/** As quatro avaliações, nos nomes do enum `rating` do banco. */
export type Rating = "again" | "hard" | "good" | "easy";

/** Nomes do enum `card_state` do banco. */
export type CardStateName = "new" | "learning" | "review" | "relearning";

/** O recorte de `cards` que o agendamento usa. */
export type CardState = {
  id: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardStateName;
  lastReview: Date | null;
};

/**
 * O que a avaliação gera para `reviews`. Guarda o estado anterior completo:
 * sem ele o desfazer não consegue devolver `due`, `reps` e `lapses` ao que
 * eram, e `reviews` é append-only — não há onde consultar depois.
 */
export type ReviewLog = {
  rating: Rating;
  stateBefore: CardStateName;
  stabilityBefore: number;
  difficultyBefore: number;
  dueBefore: Date;
  lastReviewBefore: Date | null;
  repsBefore: number;
  lapsesBefore: number;
  learningStepsBefore: number;
  elapsedDaysBefore: number;
  scheduledDaysBefore: number;
  elapsedDays: number;
  scheduledDays: number;
  dueAfter: Date;
};

export type Scheduled = {
  /** O card depois da avaliação. */
  card: CardState;
  /** A linha de histórico correspondente. */
  log: ReviewLog;
};

export type Limits = {
  newPerDay: number;
  reviewsPerDay: number;
};

/** SPEC §4: 20 novos e 200 revisões por dia. */
export const DEFAULT_LIMITS: Limits = { newPerDay: 20, reviewsPerDay: 200 };

/* ───────────────────────────── conversões ────────────────────────────── */

const PARA_FSRS_RATING: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

const PARA_FSRS_STATE: Record<CardStateName, FsrsState> = {
  new: FsrsState.New,
  learning: FsrsState.Learning,
  review: FsrsState.Review,
  relearning: FsrsState.Relearning,
};

const DO_FSRS_STATE: Record<FsrsState, CardStateName> = {
  [FsrsState.New]: "new",
  [FsrsState.Learning]: "learning",
  [FsrsState.Review]: "review",
  [FsrsState.Relearning]: "relearning",
};

function paraFsrs(card: CardState): FsrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: PARA_FSRS_STATE[card.state],
    ...(card.lastReview === null ? {} : { last_review: card.lastReview }),
  };
}

function doFsrs(id: string, card: FsrsCard): CardState {
  return {
    id,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: DO_FSRS_STATE[card.state],
    lastReview: card.last_review ?? null,
  };
}

/** Parâmetros padrão, como manda o SPEC §4. Uma instância serve ao módulo. */
const agendador = fsrs();

/* ──────────────────────────────── API ────────────────────────────────── */

/**
 * Aplica uma avaliação ao card. Não altera o card recebido: devolve o estado
 * novo e o log do que mudou, para gravar card e histórico na mesma transação.
 */
export function schedule(
  card: CardState,
  rating: Rating,
  now: Date,
): Scheduled {
  const { card: depois } = agendador.next(
    paraFsrs(card),
    now,
    PARA_FSRS_RATING[rating],
  );

  const novo = doFsrs(card.id, depois);

  return {
    card: novo,
    log: {
      rating,
      stateBefore: card.state,
      stabilityBefore: card.stability,
      difficultyBefore: card.difficulty,
      dueBefore: card.due,
      lastReviewBefore: card.lastReview,
      repsBefore: card.reps,
      lapsesBefore: card.lapses,
      learningStepsBefore: card.learningSteps,
      elapsedDaysBefore: card.elapsedDays,
      scheduledDaysBefore: card.scheduledDays,
      elapsedDays: novo.elapsedDays,
      scheduledDays: novo.scheduledDays,
      dueAfter: novo.due,
    },
  };
}

/**
 * A fila do dia: vencidos primeiro, do mais antigo para o mais recente, e
 * depois os novos, cada grupo cortado no seu limite.
 *
 * "Vencido" é o que vence até o fim do dia lógico, não até este instante — o
 * card marcado para as 23h faz parte do estudo de hoje.
 *
 * Suspenso e arquivado não chegam aqui: a consulta já os deixa de fora, pelo
 * índice parcial de `cards`.
 *
 * A ordem de entrada decide o empate entre novos (a consulta os traz na ordem
 * da nota), então a ordenação dos vencidos é estável.
 */
export function queueFor<T extends CardState>(
  cards: readonly T[],
  now: Date,
  limits: Limits = DEFAULT_LIMITS,
): T[] {
  const fim = dayEnd(now).getTime();

  const novos: T[] = [];
  const vencidos: T[] = [];

  for (const card of cards) {
    if (card.state === "new") {
      novos.push(card);
      continue;
    }

    if (card.due.getTime() <= fim) vencidos.push(card);
  }

  vencidos.sort((a, b) => a.due.getTime() - b.due.getTime());

  return [
    ...vencidos.slice(0, Math.max(0, limits.reviewsPerDay)),
    ...novos.slice(0, Math.max(0, limits.newPerDay)),
  ];
}
