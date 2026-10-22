import { marcarLacuna } from "@/shared/markdown-cloze";
import { MathMarkdown } from "@/shared/markdown";
import { cn } from "@/shared/cn";

import { setCardSuspended } from "../actions";
import { cardKindLabel, cardStateLabel } from "../labels";
import type { NoteCard } from "../queries";
import { SuspendButton } from "./suspend-button";

/** Âncora do card, o destino do sobrescrito que o corpo da nota escreve. */
export function cardAnchor(ordinal: number): string {
  return `c${ordinal + 1}`;
}

/**
 * O card na margem da nota, contra `NoteCard.dc.html`: caixa de filete, a
 * referência e o tipo na primeira linha, o estado no badge, a face em serif com
 * a lacuna **oculta**, e a linha de vencimento com o botão de suspender.
 *
 * A face não revela a resposta de propósito. Antes mostrava `prompt` e `answer`
 * um sob o outro, o que entregava de graça o que a revisão vai perguntar — a
 * margem é para reconhecer o card, não para estudá-lo.
 */
export function NoteCardBox({
  card,
  ancora = false,
}: {
  card: NoteCard;
  /**
   * Escreve o `id` do card. Só a cópia da margem o recebe: abaixo de 1100px os
   * mesmos cards aparecem na seção do fim da nota, e dois `id` iguais na mesma
   * página não são `id`.
   */
  ancora?: boolean;
}) {
  const suspenso = card.suspended;

  return (
    <article
      id={ancora ? cardAnchor(card.ordinal) : undefined}
      className="grid gap-2 rounded-sm border border-rule bg-paper p-3"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
        <span>
          {card.ordinal + 1} · {cardKindLabel(card.kind)}
        </span>
        {/* Contorno, não preenchimento: o badge diz o estado sem pintar nada.
            Suspenso troca o filete sólido pelo tracejado. */}
        <span
          className={cn(
            "rounded-sm border px-1.5 text-ink",
            suspenso ? "border-dashed border-ink-soft" : "border-ink-soft",
          )}
        >
          {cardStateLabel(card)}
        </span>
      </div>

      <MathMarkdown
        content={marcarLacuna(card.prompt)}
        className={cn("card-face note-card-face", suspenso && "suspensa")}
        lacuna="oculta"
      />

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-ink-soft">
        <span>{card.dueLabel}</span>
        <SuspendButton
          action={setCardSuspended}
          id={card.id}
          suspended={suspenso}
        />
      </div>
    </article>
  );
}
