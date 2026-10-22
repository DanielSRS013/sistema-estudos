import type { ComponentProps } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { envolverCards } from "./markdown-card-marks";
import { envolverLacuna, type Estado } from "./markdown-cloze";
import { envolverLacunasVazias } from "./markdown-empty-gap";

// Fora do componente: as listas são estáveis entre renders, e o editor
// renderiza a cada tecla.
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];
const rehypeComVazias = [rehypeKatex, envolverLacunasVazias()];
const rehypeComCards = [rehypeKatex, envolverCards()];
const rehypeComLacuna = {
  oculta: [rehypeKatex, envolverLacuna("oculta")],
  revelada: [rehypeKatex, envolverLacuna("revelada")],
};

type Props = ComponentProps<typeof Markdown>;
type Plugin = NonNullable<Props["rehypePlugins"]>[number];

function rehypeDe(
  lacuna: Estado | undefined,
  vazias: boolean,
  marcarCards: boolean,
) {
  if (lacuna !== undefined) return rehypeComLacuna[lacuna];
  if (vazias) return rehypeComVazias;
  if (marcarCards) return rehypeComCards;

  return rehypePlugins;
}

/**
 * Markdown com matemática. Serve ao corpo da nota (leitura e pré-visualização
 * do editor) e à face do card na revisão — por isso vive em `shared` e não
 * leva "use client".
 *
 * O CSS do KaTeX é importado uma vez no layout raiz, nunca aqui.
 */
export function MathMarkdown({
  content,
  className = "note-prose",
  vazias = false,
  lacuna,
  marcarCards = false,
  plugin,
  components,
  children,
}: {
  content: string;
  className?: string;
  /**
   * Envolve cada lacuna vazia num `span`, para o filete de 2px da
   * pré-visualização do editor. Exige que `content` tenha passado por
   * `marcarLacunasVazias`. Só o editor pede: na leitura da nota e na face do
   * card a marca nunca chega.
   */
  vazias?: boolean;
  /**
   * Envolve a lacuna do cloze num `span`, para o filete do estado pergunta e
   * o fundo do estado resposta. Exige que `content` tenha passado por
   * `marcarLacuna`.
   */
  lacuna?: Estado;
  /**
   * Sublinha a lacuna e escreve o sobrescrito `#cN`, e troca o par `Q::`/`A::`
   * pelo bloco Pergunta/Resposta. Exige que `content` tenha passado por
   * `marcarCardsNoCorpo`. Só a leitura da nota pede: na face do card a lacuna
   * tem outro tratamento, e a pré-visualização do editor mostra a nota como
   * texto, sem os números da margem.
   */
  marcarCards?: boolean;
  /**
   * Um plugin de rehype a mais, depois dos do modo. É por aqui que a leitura da
   * nota entra com o que ela sabe e `shared` não precisa saber: onde os cards
   * caem entre os blocos (`cards/by-block.ts`) e o número da lacuna no corpo.
   */
  plugin?: Plugin;
  /** Como desenhar um elemento que o plugin inseriu — o `aside` dos cards. */
  components?: Props["components"];
  /**
   * O que entra na mesma caixa, depois do Markdown. A margem da nota é filha da
   * grade, e não um irmão dela: é a grade que põe cada card na linha do seu
   * bloco.
   */
  children?: React.ReactNode;
}) {
  const rehype = rehypeDe(lacuna, vazias, marcarCards);

  return (
    <div className={className}>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={plugin === undefined ? rehype : [...rehype, plugin]}
        components={components}
      >
        {content}
      </Markdown>
      {children}
    </div>
  );
}
