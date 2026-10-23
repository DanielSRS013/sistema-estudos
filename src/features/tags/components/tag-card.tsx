import Link from "next/link";

import { cardStateLabel } from "@/features/cards/labels";
import { cn } from "@/shared/cn";
import { MathMarkdown } from "@/shared/markdown";
import { marcarLacuna } from "@/shared/markdown-cloze";

import type { TagCard } from "../queries";

/**
 * Um card na página do conceito, na forma do handoff: a face em serif de 17px à
 * esquerda, e à direita o estado em badge de contorno com o link de volta para
 * a nota que o gerou.
 *
 * A face mostra a frente com a lacuna **oculta**, como a margem da nota — a
 * página do conceito é para reconhecer o card, não para estudá-lo, e a resposta
 * impressa aqui entregaria de graça o que a revisão vai perguntar. Era o item
 * de `cards/components/card-item.tsx` quem desenhava esta lista, com `prompt` e
 * `answer` um sob o outro em dois badges de Mono.
 */
export function TagCardRow({ card }: { card: TagCard }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 border-b border-rule py-3.5">
      <MathMarkdown
        content={marcarLacuna(card.prompt)}
        className="card-face tag-card-face min-w-0 grow basis-80"
        lacuna="oculta"
      />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-soft">
        {/* Contorno, não preenchimento: nenhuma cor informa fora do viridis.
            Suspenso troca o filete sólido pelo tracejado, como na margem. */}
        <span
          className={cn(
            "rounded-sm border px-1.5 text-ink",
            card.suspended ? "border-dashed border-ink-soft" : "border-ink-soft",
          )}
        >
          {cardStateLabel(card)}
        </span>
        <Link
          href={`/notes/${card.note.id}`}
          className="min-w-0 hover:text-accent"
        >
          {card.note.title}
        </Link>
      </div>
    </li>
  );
}
