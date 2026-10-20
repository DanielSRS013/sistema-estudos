import { db } from "@/db";

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
};

export type NoteCards = {
  /** Cards que o texto atual da nota gera, na ordem do documento. */
  active: NoteCard[];
  /** Quantos saíram da fila por edição — nenhum foi apagado. */
  archived: number;
};

export async function listCardsForNote(noteId: string): Promise<NoteCards> {
  const rows = await db.query.cards.findMany({
    where: (card, { eq }) => eq(card.noteId, noteId),
    orderBy: (card, { asc }) => [asc(card.ordinal)],
    columns: {
      id: true,
      kind: true,
      ordinal: true,
      prompt: true,
      answer: true,
      hint: true,
      state: true,
      reps: true,
      suspended: true,
      archivedAt: true,
    },
  });

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
      })),
    archived: rows.filter((row) => row.archivedAt !== null).length,
  };
}
