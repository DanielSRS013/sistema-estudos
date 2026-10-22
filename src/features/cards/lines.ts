// Liga trecho de texto a card renderizado — SPEC §6: "margem direita mostra
// os cards gerados pelo trecho visível". Funções puras: sem I/O, sem React.
//
// "Trecho visível" era a viewport: a margem media os blocos com
// `IntersectionObserver` e apagava a 50% quem estava fora. O handoff resolve o
// mesmo vínculo por posição — o card mora na linha da grade do bloco que o
// gerou —, e por isso `cardsNoTrecho` e `destaqueDoTrecho` saíram daqui junto
// com os testes deles: não havia mais trecho a seguir, só bloco a encontrar, e
// quem encontra é `blocoDe`, que ficou. Um teste de função apagada vira
// garantia de comportamento que a tela não tem mais.
//
// A linha de origem do card não mora no banco: `parse` já a conhece, e
// reparsear o conteúdo salvo da nota a reconstrói sem migration nenhuma. O
// vínculo com a linha do banco é a `anchorKey`, que `cardWrites` mantém
// sincronizada com o texto a cada gravação.

import { parse } from "./parser";
import { anchorKey } from "./reconcile";

export type CardLines = {
  /** Âncora do card → linha da nota, base 1. */
  byAnchor: Map<string, number>;
  /** Posição do card dentro da nota → a mesma linha. */
  byOrdinal: Map<number, number>;
};

export function cardLines(content: string): CardLines {
  const byAnchor = new Map<string, number>();
  const byOrdinal = new Map<number, number>();

  for (const card of parse(content).cards) {
    byAnchor.set(anchorKey(card.prompt, card.answer), card.line);
    byOrdinal.set(card.ordinal, card.line);
  }

  return { byAnchor, byOrdinal };
}

/**
 * Linha de origem de um card do banco. A âncora manda; a posição é a rede de
 * segurança para o card gravado antes de uma edição que mudou o trecho — ele
 * ainda aparece na margem, só não acompanha o destaque com precisão.
 */
export function lineOf(
  lines: CardLines,
  card: { anchorKey: string; ordinal: number },
): number | null {
  return (
    lines.byAnchor.get(card.anchorKey) ??
    lines.byOrdinal.get(card.ordinal) ??
    null
  );
}

/**
 * Qual bloco renderizado contém uma linha da nota. `blocos` são as linhas
 * iniciais dos blocos de topo, que o plugin de `by-block.ts` lê da árvore.
 *
 * Linha antes do primeiro bloco cai nele: o parser conta a linha crua e o
 * render pode começar depois dela (uma linha em branco à frente, por exemplo),
 * e nesse caso o trecho pertence visualmente ao primeiro bloco.
 */
export function blocoDe(line: number, blocos: number[]): number | null {
  const ordenados = [...blocos].sort((a, b) => a - b);
  const primeiro = ordenados[0];

  if (primeiro === undefined) return null;

  let achado = primeiro;

  for (const inicio of ordenados) {
    if (inicio > line) break;
    achado = inicio;
  }

  return achado;
}
