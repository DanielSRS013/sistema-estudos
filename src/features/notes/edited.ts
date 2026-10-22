// "Editada há 2 h" — a última edição no meta da leitura da nota. Puro: entra a
// hora gravada, sai a frase.
//
// O rótulo relativo é o mesmo do painel (`recent.ts`), para a nota não dizer
// "há 2 h" numa tela e "hoje 13:00" na outra. O que muda é a frase em volta: o
// painel escreve o tempo sozinho numa coluna, aqui ele entra numa linha de
// metadados e precisa do verbo — e da preposição, quando o rótulo é uma data.

import { lastEditLabel } from "./recent";

/** Rótulo que começa por dígito é data: "14/10", "31/12/2025". */
const DATA = /^\d/;

function editadaEm(at: Date, now: Date): string {
  const quando = lastEditLabel(at, now);

  return DATA.test(quando) ? `editada em ${quando}` : `editada ${quando}`;
}

export function noteEditedLabel(at: Date, now: Date): string {
  const frase = editadaEm(at, now);

  return frase[0]!.toUpperCase() + frase.slice(1);
}

/**
 * "4 cards · editada há 2 h" — a terceira linha da nota na lista da aula.
 *
 * Aqui a frase da edição entra no meio da linha, em caixa baixa; na leitura da
 * nota ela abre a coluna e vai em maiúscula. A mesma função escreve as duas,
 * para a nota não dizer "há 2 h" numa tela e outra coisa na outra.
 */
export function noteLineMeta(
  cardCount: number,
  at: Date,
  now: Date,
): string {
  const cards =
    cardCount === 0
      ? "Sem cards"
      : `${cardCount} ${cardCount === 1 ? "card" : "cards"}`;

  return `${cards} · ${editadaEm(at, now)}`;
}
