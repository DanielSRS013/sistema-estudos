import { realcarCodigo } from "@/features/notes/code";
import { MathMarkdown } from "@/shared/markdown";
import { realcarBlocos } from "@/shared/markdown-code";

import { cardsPorBloco } from "../by-block";
import type { NoteCard } from "../queries";
import { NoteCardBox } from "./note-card";

/**
 * O corpo da nota com os cards na margem, como uma grade só: cada bloco do
 * texto é uma linha, e o card que o bloco gerou fica na coluna 2 da mesma linha
 * (`.note-grid` em globals.css).
 *
 * Os `aside` entram na árvore pelo plugin `cardsPorBloco`; aqui está só o
 * desenho de cada um. Acima de 1100px eles são a margem; abaixo, somem — e os
 * mesmos cards aparecem na seção recolhível do fim da nota.
 */
export function NoteBody({
  content,
  cards,
  children,
}: {
  content: string;
  cards: NoteCard[];
  /** O que fecha a coluna de leitura — o bloco de tags da nota. */
  children?: React.ReactNode;
}) {
  return (
    <MathMarkdown
      content={content}
      className="note-prose note-grid"
      marcarCards
      plugins={[cardsPorBloco(cards, content), realcarBlocos(realcarCodigo)]}
      components={{
        /* Os índices chegam no `data-cards` que o plugin escreveu. São lidos
           do nó do hast, e não das props do elemento, porque é lá que o
           atributo tem nome e tipo — nas props ele é um extra que o React
           repassaria ao DOM. */
        aside: ({ node }: { node?: { properties?: Record<string, unknown> } }) => {
          const indices = String(node?.properties?.["data-cards"] ?? "")
            .split(" ")
            .filter((parte) => parte !== "")
            .map(Number);

          return (
            <aside className="note-cards" aria-label="Cards do trecho">
              {indices.map((indice) => {
                const card = cards[indice];

                return card === undefined ? null : (
                  <NoteCardBox key={card.id} card={card} ancora />
                );
              })}
            </aside>
          );
        },
      }}
    >
      {children}
    </MathMarkdown>
  );
}
