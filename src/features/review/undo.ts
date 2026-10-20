// Desfazer a última avaliação — SPEC §4 e PLAN fatia 4.
//
// A reversão é só esta função pura: ela devolve o card ao estado que o log da
// avaliação guardou. Quem grava é `actions.ts`, e grava *inserindo* uma nova
// linha em `reviews` que aponta para a revertida. A linha original nunca é
// apagada nem alterada — `reviews` é append-only (SPEC §2).

import type { CardState, ReviewLog } from "./scheduler";

/**
 * O card como estava antes da avaliação que gerou `log`.
 *
 * Todo campo sai do log, nenhum é recalculado: é por isso que `reviews` guarda
 * o estado anterior inteiro em vez de só o rating. Desfazer duas avaliações em
 * sequência funciona pelo mesmo motivo — cada log carrega o seu próprio antes.
 */
export function revert(card: CardState, log: ReviewLog): CardState {
  return {
    id: card.id,
    due: log.dueBefore,
    stability: log.stabilityBefore,
    difficulty: log.difficultyBefore,
    elapsedDays: log.elapsedDaysBefore,
    scheduledDays: log.scheduledDaysBefore,
    learningSteps: log.learningStepsBefore,
    reps: log.repsBefore,
    lapses: log.lapsesBefore,
    state: log.stateBefore,
    lastReview: log.lastReviewBefore,
  };
}
