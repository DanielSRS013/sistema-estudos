import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { envolverLacuna, type Estado } from "./markdown-cloze";
import { envolverLacunasVazias } from "./markdown-empty-gap";
import { anotarLinhas } from "./markdown-lines";

// Fora do componente: as listas são estáveis entre renders, e o editor
// renderiza a cada tecla.
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];
const rehypeComLinhas = [rehypeKatex, anotarLinhas];
const rehypeComVazias = [rehypeKatex, envolverLacunasVazias()];
const rehypeComLacuna = {
  oculta: [rehypeKatex, envolverLacuna("oculta")],
  revelada: [rehypeKatex, envolverLacuna("revelada")],
};

function rehypeDe(
  lacuna: Estado | undefined,
  marcarLinhas: boolean,
  vazias: boolean,
) {
  if (lacuna !== undefined) return rehypeComLacuna[lacuna];
  if (vazias) return rehypeComVazias;

  return marcarLinhas ? rehypeComLinhas : rehypePlugins;
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
  marcarLinhas = false,
  vazias = false,
  lacuna,
}: {
  content: string;
  className?: string;
  /**
   * Escreve `data-line` em cada bloco de topo, que é como a margem de cards
   * acha o trecho visível (SPEC §6). Só a leitura da nota precisa disso: a
   * face do card na revisão e a pré-visualização do editor saem sem marca.
   */
  marcarLinhas?: boolean;
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
}) {
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypeDe(lacuna, marcarLinhas, vazias)}
      >
        {content}
      </Markdown>
    </div>
  );
}
