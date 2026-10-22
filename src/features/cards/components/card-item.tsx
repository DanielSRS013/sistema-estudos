import Link from "next/link";

import type { NoteCard } from "../queries";

/** O que o item mostra. A margem da nota e a página do conceito passam mais
 *  campos que isto — `line` lá, `note` aqui — e o item só lê o que desenha. */
export type CardFace = Omit<NoteCard, "ordinal" | "line" | "dueLabel">;

/**
 * Estado do FSRS em português. Cor fica de fora de propósito: SPEC §6 reserva
 * o viridis para os botões de avaliação, o único lugar onde a cor informa.
 */
const ESTADO: Record<CardFace["state"], string> = {
  new: "novo",
  learning: "aprendendo",
  review: "revisão",
  relearning: "reaprendendo",
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-soft">
      {children}
    </span>
  );
}

/**
 * Um card com seu estado, na página do conceito: lá o card vem de outra nota,
 * então `nota` leva de volta à origem, e o controle de suspender fica de fora.
 *
 * A margem da nota tinha este mesmo item e não tem mais — ela usa
 * `note-card.tsx`, a caixa de `NoteCard.dc.html`. A Fatia 22 reescreve a página
 * do conceito e decide se as duas voltam a ser uma.
 */
export function CardItem({
  card,
  nota,
  controle,
}: {
  card: CardFace;
  nota?: { id: string; title: string };
  controle?: React.ReactNode;
}) {
  return (
    <li className="space-y-1 border-t border-rule pt-2 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{card.kind === "cloze" ? "lacuna" : "pergunta"}</Badge>
        <Badge>{ESTADO[card.state]}</Badge>
        {card.suspended ? <Badge>suspenso</Badge> : null}
        {card.reps > 0 ? (
          <span className="font-mono text-xs text-ink-soft">
            {card.reps} {card.reps === 1 ? "revisão" : "revisões"}
          </span>
        ) : null}
        {controle ? <span className="ml-auto">{controle}</span> : null}
      </div>
      <p className="font-serif text-sm leading-snug text-ink">{card.prompt}</p>
      <p className="font-serif text-sm leading-snug text-ink-soft">
        {card.answer}
      </p>
      {nota ? (
        <Link
          href={`/notes/${nota.id}`}
          className="block truncate font-mono text-xs text-ink-soft hover:text-accent"
        >
          {nota.title}
        </Link>
      ) : null}
    </li>
  );
}
