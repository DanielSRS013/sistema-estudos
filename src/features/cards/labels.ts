// O que a linha do card diz na tela: tipo, estado e vencimento. Módulo puro —
// entra o card como o banco o guarda, sai o texto em português do handoff.
//
// Mora na feature `cards` porque três telas leem os mesmos rótulos: a margem da
// nota (`NoteCard.dc.html`), a página do conceito e os resultados de busca. Uma
// segunda cópia divergiria, e o mesmo card apareceria "aprendendo" num lugar e
// "reaprendendo" no outro.

import { daysUntil } from "@/features/review/day";

import type { CardKind } from "./parser";

const TIPOS: Record<CardKind, string> = {
  cloze: "Lacuna",
  qa: "Pergunta",
};

/** "1 · Lacuna" — a primeira linha do card da margem. */
export function cardKindLabel(kind: CardKind): string {
  return TIPOS[kind];
}

export type CardState = "new" | "learning" | "review" | "relearning";

/**
 * Estado do FSRS em português. Quatro rótulos, não cinco: o handoff exibe novo,
 * aprendendo, revisão e suspenso, e "reaprendendo" cai em "aprendendo" — a
 * diferença entre os dois é do agendador, não de quem lê a margem.
 *
 * Cor fica de fora de propósito: SPEC §6 reserva o viridis para os botões de
 * avaliação, o único lugar onde a cor informa.
 */
const ESTADOS: Record<CardState, string> = {
  new: "novo",
  learning: "aprendendo",
  review: "revisão",
  relearning: "aprendendo",
};

export function cardStateLabel({
  state,
  suspended,
}: {
  state: CardState;
  suspended: boolean;
}): string {
  return suspended ? "suspenso" : ESTADOS[state];
}

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/**
 * A última linha do card: "Vence em 3 dias · 6 revisões", "Vence hoje · 2
 * revisões", "Ainda não revisado" ou "Suspenso".
 *
 * Três decisões escritas aqui:
 *
 * - Suspenso não leva data. O handoff escreve "Suspenso desde 12 out.", mas não
 *   existe `cards.suspendedAt` — a Fatia 9 fixou que suspender não grava nada —
 *   e inventar a coluna para uma linha de texto não se paga.
 * - Quem decide "nunca revisado" é `reps`, não `state`: o card retomado antes
 *   da primeira revisão já tem `due` no futuro e nenhuma revisão feita.
 * - O que já venceu lê "Vence hoje", porque é exatamente o que a fila faz com
 *   ele hoje — `daysUntil` satura em zero pelo dia lógico de SPEC §4.
 */
export function dueLabel(
  card: { due: Date; reps: number; suspended: boolean },
  now: Date,
): string {
  if (card.suspended) return "Suspenso";
  if (card.reps === 0) return "Ainda não revisado";

  const dias = daysUntil(card.due, now);
  const vencimento =
    dias === 0 ? "Vence hoje" : `Vence em ${plural(dias, "dia", "dias")}`;

  return `${vencimento} · ${plural(card.reps, "revisão", "revisões")}`;
}
