// A ponte entre os módulos puros e o banco. O plano é calculado por
// `reconcile`; aqui ele só vira statements, que o chamador grava num batch
// único — no driver HTTP do Neon, `db.batch` é a transação.

import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import { cards } from "@/db/schema";

import { parse, type ParseIssue } from "./parser";
import { reconcile, type ReconcilePlan } from "./reconcile";

export type CardsPlan = {
  plan: ReconcilePlan;
  issues: ParseIssue[];
  /** Quantos cards ativos a nota terá depois da gravação. */
  total: number;
};

/**
 * Lê os cards que a nota já tem, parseia o texto novo e devolve o plano.
 * A leitura acontece antes do batch: num app de um usuário só, duas edições
 * simultâneas da mesma nota não acontecem, e se acontecessem o batch falharia
 * inteiro em vez de gravar pela metade.
 */
export async function planCards(
  noteId: string,
  content: string,
): Promise<CardsPlan> {
  const { cards: parsed, issues } = parse(content);

  const existentes = await db.query.cards.findMany({
    where: (card, { eq: igual }) => igual(card.noteId, noteId),
    columns: {
      id: true,
      anchorKey: true,
      ordinal: true,
      prompt: true,
      answer: true,
      hint: true,
      archivedAt: true,
    },
  });

  const plan = reconcile(existentes, parsed);

  const repetidos = plan.duplicates.map((card) => ({
    line: card.line,
    message: "Este trecho já virou card nesta nota; o repetido foi ignorado.",
  }));

  return {
    plan,
    issues: [...issues, ...repetidos],
    total: plan.update.length + plan.create.length,
  };
}

/**
 * Statements do plano, na ordem: atualiza, arquiva, insere. Nenhum DELETE —
 * card sai da fila por `archivedAt`, nunca por remoção de linha.
 */
export function cardWrites(
  noteId: string,
  plan: ReconcilePlan,
  now: Date,
): BatchItem<"pg">[] {
  const writes: BatchItem<"pg">[] = [];

  // O índice único é (noteId, anchorKey), então uma âncora nova nunca pode
  // ser a de outro card da nota. `reconcile` garante isso casando todas as
  // âncoras exatas antes de casar por posição — e reconcile.test.ts trava a
  // invariante, porque violá-la derrubaria a gravação inteira.
  for (const card of plan.update) {
    writes.push(
      db
        .update(cards)
        .set({
          anchorKey: card.anchorKey,
          kind: card.kind,
          ordinal: card.ordinal,
          prompt: card.prompt,
          answer: card.answer,
          hint: card.hint,
          // O trecho voltou numa edição seguinte: o card volta com ele, com o
          // histórico de revisão inteiro.
          ...(card.unarchive ? { archivedAt: null } : {}),
        })
        .where(eq(cards.id, card.id)),
    );
  }

  if (plan.archive.length > 0) {
    writes.push(
      db
        .update(cards)
        .set({ archivedAt: now })
        .where(inArray(cards.id, plan.archive)),
    );
  }

  if (plan.create.length > 0) {
    writes.push(
      db.insert(cards).values(
        plan.create.map((card) => ({
          noteId,
          anchorKey: card.anchorKey,
          kind: card.kind,
          ordinal: card.ordinal,
          prompt: card.prompt,
          answer: card.answer,
          hint: card.hint,
        })),
      ),
    );
  }

  return writes;
}
