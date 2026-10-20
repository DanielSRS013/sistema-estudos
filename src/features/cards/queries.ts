import { cache } from "react";

import { db } from "@/db";

import { cardLines, lineOf } from "./lines";
import type { CardKind } from "./parser";

export type NoteCard = {
  id: string;
  kind: CardKind;
  ordinal: number;
  prompt: string;
  answer: string;
  hint: string | null;
  state: "new" | "learning" | "review" | "relearning";
  reps: number;
  /** Fora da fila por decisão do usuário, com o histórico intacto. */
  suspended: boolean;
  /**
   * Linha da nota que gerou o card, base 1 — é por ela que a margem sabe se o
   * card está no trecho visível. `null` quando o texto salvo não gera mais
   * este card: acontece com card arquivado e com âncora de outra versão.
   */
  line: number | null;
};

export type NoteCards = {
  /** Cards que o texto atual da nota gera, na ordem do documento. */
  active: NoteCard[];
  /** Quantos saíram da fila por edição — nenhum foi apagado. */
  archived: number;
};

/**
 * Os cards da nota com a linha de origem de cada um.
 *
 * Em `cache` porque a página pede a mesma lista duas vezes — a margem acima de
 * 1100px e a seção recolhida abaixo dele — e as duas devem custar uma consulta.
 */
export const listCardsForNote = cache(async function listCardsForNote(
  noteId: string,
): Promise<NoteCards> {
  const [note, rows] = await Promise.all([
    db.query.notes.findFirst({
      where: (nota, { eq }) => eq(nota.id, noteId),
      columns: { content: true },
    }),
    db.query.cards.findMany({
      where: (card, { eq }) => eq(card.noteId, noteId),
      orderBy: (card, { asc }) => [asc(card.ordinal)],
      columns: {
        id: true,
        kind: true,
        anchorKey: true,
        ordinal: true,
        prompt: true,
        answer: true,
        hint: true,
        state: true,
        reps: true,
        suspended: true,
        archivedAt: true,
      },
    }),
  ]);

  const lines = cardLines(note?.content ?? "");

  return {
    active: rows
      .filter((row) => row.archivedAt === null)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        ordinal: row.ordinal,
        prompt: row.prompt,
        answer: row.answer,
        hint: row.hint,
        state: row.state,
        reps: row.reps,
        suspended: row.suspended,
        line: lineOf(lines, row),
      })),
    archived: rows.filter((row) => row.archivedAt !== null).length,
  };
});
