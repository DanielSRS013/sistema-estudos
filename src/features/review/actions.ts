"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { SETTINGS_ID, cards, reviews, settings } from "@/db/schema";
import type { ActionState } from "@/shared/action-state";

import { fetchUndoTarget, type QueueCard } from "./queries";
import { saveLimitsSchema } from "./schemas";
import { schedule, type CardState } from "./scheduler";
import { revert } from "./undo";

const FALHA_GENERICA =
  "Não foi possível gravar a avaliação. Confira a conexão e tente de novo.";

const rateSchema = z.object({
  cardId: z.string().uuid("Card inválido."),
  rating: z.enum(["again", "hard", "good", "easy"], {
    message: "Avaliação inválida.",
  }),
  /** Milissegundos entre revelar a resposta e avaliar. */
  durationMs: z.number().int().nonnegative().max(3_600_000).optional(),
});

export type RateResult =
  | { ok: true; dueAt: string }
  | { ok: false; message: string };

/** As colunas do card que o agendamento escreve de volta. */
function colunas(card: CardState) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.lastReview,
  };
}

/**
 * Avalia um card. `UPDATE cards` e `INSERT reviews` vão no mesmo `db.batch`,
 * que no driver HTTP do Neon é uma transação só: ou os dois valem, ou nenhum.
 * Um card atualizado sem a linha de histórico seria estado perdido para
 * sempre, porque é de `reviews` que o desfazer lê.
 */
export async function rateCard(input: unknown): Promise<RateResult> {
  const parsed = rateSchema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Entrada inválida.";
    return { ok: false, message };
  }

  const { cardId, rating, durationMs } = parsed.data;

  try {
    const atual = await db.query.cards.findFirst({
      where: (card, { eq: igual, and: e, isNull: nulo }) =>
        e(igual(card.id, cardId), nulo(card.archivedAt)),
      columns: {
        id: true,
        due: true,
        stability: true,
        difficulty: true,
        elapsedDays: true,
        scheduledDays: true,
        learningSteps: true,
        reps: true,
        lapses: true,
        state: true,
        lastReview: true,
        suspended: true,
      },
    });

    if (!atual) return { ok: false, message: "Card não encontrado." };
    if (atual.suspended) return { ok: false, message: "Card suspenso." };

    const estado: CardState = {
      id: atual.id,
      due: atual.due,
      stability: atual.stability,
      difficulty: atual.difficulty,
      elapsedDays: atual.elapsedDays,
      scheduledDays: atual.scheduledDays,
      learningSteps: atual.learningSteps,
      reps: atual.reps,
      lapses: atual.lapses,
      state: atual.state,
      lastReview: atual.lastReview,
    };

    const { card: depois, log } = schedule(estado, rating, new Date());

    await db.batch([
      db.update(cards).set(colunas(depois)).where(eq(cards.id, cardId)),
      db.insert(reviews).values({
        cardId,
        rating: log.rating,
        stateBefore: log.stateBefore,
        stabilityBefore: log.stabilityBefore,
        difficultyBefore: log.difficultyBefore,
        dueBefore: log.dueBefore,
        lastReviewBefore: log.lastReviewBefore,
        repsBefore: log.repsBefore,
        lapsesBefore: log.lapsesBefore,
        learningStepsBefore: log.learningStepsBefore,
        elapsedDaysBefore: log.elapsedDaysBefore,
        scheduledDaysBefore: log.scheduledDaysBefore,
        scheduledDays: log.scheduledDays,
        elapsedDays: log.elapsedDays,
        dueAfter: log.dueAfter,
        ...(durationMs === undefined ? {} : { durationMs }),
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/review");

    return { ok: true, dueAt: depois.due.toISOString() };
  } catch (error) {
    console.error(error);
    return { ok: false, message: FALHA_GENERICA };
  }
}

export type UndoResult =
  | { ok: true; card: QueueCard }
  | { ok: false; message: string };

/**
 * Desfaz a última avaliação válida do app.
 *
 * O card volta ao estado que a linha de `reviews` guardou, e a reversão entra
 * como **linha nova**, apontando para a que desfez. A original fica onde está:
 * `reviews` é append-only (SPEC §2), e o índice único em `undoes_review_id`
 * impede desfazer a mesma avaliação duas vezes.
 */
export async function undoLast(): Promise<UndoResult> {
  try {
    const alvo = await fetchUndoTarget();

    if (alvo === null) {
      return { ok: false, message: "Nada para desfazer." };
    }

    const { card: atual, log, reviewId } = alvo;
    const antes = revert(atual, log);

    await db.batch([
      db
        .update(cards)
        .set(colunas(antes))
        .where(and(eq(cards.id, atual.id), isNull(cards.archivedAt))),
      // A reversão descreve a transição que ela mesma fez: o "antes" é o card
      // como a avaliação o deixou, o "depois" é o estado restaurado.
      db.insert(reviews).values({
        cardId: atual.id,
        rating: log.rating,
        stateBefore: atual.state,
        stabilityBefore: atual.stability,
        difficultyBefore: atual.difficulty,
        dueBefore: atual.due,
        lastReviewBefore: atual.lastReview,
        repsBefore: atual.reps,
        lapsesBefore: atual.lapses,
        learningStepsBefore: atual.learningSteps,
        elapsedDaysBefore: atual.elapsedDays,
        scheduledDaysBefore: atual.scheduledDays,
        scheduledDays: antes.scheduledDays,
        elapsedDays: antes.elapsedDays,
        dueAfter: antes.due,
        undoesReviewId: reviewId,
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/review");

    return { ok: true, card: { ...atual, ...antes } };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      message: "Não foi possível desfazer agora. Tente de novo.",
    };
  }
}

/* ───────────────────────────── limites ───────────────────────────────── */

/**
 * Grava os limites diários. `settings` tem uma linha só: o `insert` com
 * `onConflictDoUpdate` na chave fixa cria na primeira vez e atualiza nas
 * seguintes, sem precisar saber qual dos dois casos é.
 */
export async function saveLimits(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = saveLimitsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Entrada inválida.";
    return { ok: false, message };
  }

  const valores = {
    newPerDay: parsed.data.newPerDay,
    reviewsPerDay: parsed.data.reviewsPerDay,
    updatedAt: new Date(),
  };

  try {
    await db
      .insert(settings)
      .values({ id: SETTINGS_ID, ...valores })
      .onConflictDoUpdate({ target: settings.id, set: valores });
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      message:
        "Não foi possível gravar os limites. Confira a conexão e tente de novo.",
    };
  }

  // O corte mudou: o painel e a fila precisam ser recontados.
  revalidatePath("/");
  revalidatePath("/review");

  return { ok: true };
}
