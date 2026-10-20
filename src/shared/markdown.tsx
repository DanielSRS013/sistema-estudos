import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { anotarLinhas } from "./markdown-lines";

// Fora do componente: as listas são estáveis entre renders, e o editor
// renderiza a cada tecla.
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];
const rehypeComLinhas = [rehypeKatex, anotarLinhas];

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
}: {
  content: string;
  className?: string;
  /**
   * Escreve `data-line` em cada bloco de topo, que é como a margem de cards
   * acha o trecho visível (SPEC §6). Só a leitura da nota precisa disso: a
   * face do card na revisão e a pré-visualização do editor saem sem marca.
   */
  marcarLinhas?: boolean;
}) {
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={marcarLinhas ? rehypeComLinhas : rehypePlugins}
      >
        {content}
      </Markdown>
    </div>
  );
}
