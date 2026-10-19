import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Fora do componente: as listas são estáveis entre renders, e o editor
// renderiza a cada tecla.
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

/**
 * Corpo da nota renderizado. Serve tanto à leitura (no servidor) quanto à
 * pré-visualização do editor (no cliente) — por isso não leva "use client".
 *
 * O CSS do KaTeX é importado uma vez no layout raiz, nunca aqui.
 */
export function NoteMarkdown({ content }: { content: string }) {
  return (
    <div className="note-prose">
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </Markdown>
    </div>
  );
}
