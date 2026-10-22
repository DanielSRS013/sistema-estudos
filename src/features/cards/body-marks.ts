// O corpo da nota com cada card marcado para o render achar.
//
// Mesma divisão de `empty-gaps.ts`: aqui a cirurgia na string, em
// `shared/markdown-card-marks.ts` os elementos que o plugin monta. Esta metade
// mora na feature `cards` porque o que ela precisa saber — onde está um card no
// texto — é conhecimento do parser, e perguntar a ele é o que mantém o número
// do sobrescrito igual ao ordinal do card da margem.

import { marcasDeCard } from "@/shared/markdown-card-marks";

import { posicoesDeCards } from "./parser";

/** Um trecho do texto e o que entra no lugar dele. */
type Edicao = { inicio: number; fim: number; texto: string };

function quebras(texto: string): number {
  return texto.split("\n").length - 1;
}

function edicoesDe(markdown: string): Edicao[] {
  return posicoesDeCards(markdown).flatMap((posicao): Edicao[] => {
    // O número é o ordinal como a tela o conta: base 1, igual à âncora `#cN`.
    const numero = `${posicao.ordinal + 1}${marcasDeCard.numero}`;

    if (posicao.kind === "cloze") {
      const trocado = `${marcasDeCard.lacuna}${posicao.answer}${marcasDeCard.fecha}${numero}`;
      // A resposta sai do parser numa linha só, mas o `{{…}}` que ela substitui
      // pode atravessar duas — e aí o texto marcado ficaria mais curto que a
      // nota. As linhas do card são contadas no texto cru e as do bloco no
      // marcado: encurtar aqui põe o card na margem de outro trecho. As quebras
      // perdidas voltam depois do sobrescrito, onde são quebra leve e não mudam
      // nem o bloco nem o que se lê.
      const perdidas = quebras(markdown.slice(posicao.inicio, posicao.fim));

      return [
        {
          inicio: posicao.inicio,
          fim: posicao.fim,
          texto: trocado + "\n".repeat(perdidas),
        },
      ];
    }

    return [
      {
        ...posicao.pergunta,
        texto: `${marcasDeCard.pergunta}${numero}`,
      },
      {
        ...posicao.resposta,
        texto: marcasDeCard.resposta,
      },
    ];
  });
}

/**
 * O Markdown da nota com as marcas de controle de cada card.
 *
 * A lacuna perde as chaves e fica com a resposta à vista — é o que o handoff
 * mostra na leitura, sublinhado e numerado. A dica cai: ela existe para o modo
 * foco, onde a resposta está escondida.
 *
 * Nota sem card volta idêntica, que é o caso de toda nota de texto corrido.
 */
export function marcarCardsNoCorpo(markdown: string): string {
  const edicoes = edicoesDe(markdown);

  if (edicoes.length === 0) return markdown;

  // Em ordem de posição: as edições vêm na ordem dos cards, e dentro de um
  // bloco o par `Q::`/`A::` já vem depois das lacunas, mas depender dessa
  // coincidência seria apostar na varredura não mudar nunca.
  const ordenadas = [...edicoes].sort((a, b) => a.inicio - b.inicio);

  let saida = "";
  let cursor = 0;

  for (const edicao of ordenadas) {
    saida += markdown.slice(cursor, edicao.inicio) + edicao.texto;
    cursor = edicao.fim;
  }

  return saida + markdown.slice(cursor);
}
