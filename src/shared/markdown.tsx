import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Fora do componente: as listas são estáveis entre renders, e o editor
// renderiza a cada tecla.
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

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
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </Markdown>
    </div>
  );
}
