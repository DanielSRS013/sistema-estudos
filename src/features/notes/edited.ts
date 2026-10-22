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

export function noteEditedLabel(at: Date, now: Date): string {
  const quando = lastEditLabel(at, now);

  return DATA.test(quando) ? `Editada em ${quando}` : `Editada ${quando}`;
}
