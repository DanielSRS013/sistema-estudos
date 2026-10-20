import Link from "next/link";

import { listCardsForNote, type NoteCard } from "../queries";

/**
 * Estado do FSRS em português. Cor fica de fora de propósito: SPEC §6 reserva
 * o viridis para os botões de avaliação, o único lugar onde a cor informa.
 */
const ESTADO: Record<NoteCard["state"], string> = {
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
 * Um card com seu estado. Serve à margem da nota e à página do conceito —
 * lá o card vem de outra nota, então `nota` leva de volta à origem.
 */
export function CardItem({
  card,
  nota,
}: {
  card: NoteCard;
  nota?: { id: string; title: string };
}) {
  return (
    <li className="space-y-1 border-t border-rule pt-2 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{card.kind === "cloze" ? "lacuna" : "pergunta"}</Badge>
        <Badge>{ESTADO[card.state]}</Badge>
        {card.reps > 0 ? (
          <span className="font-mono text-xs text-ink-soft">
            {card.reps} {card.reps === 1 ? "revisão" : "revisões"}
          </span>
        ) : null}
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

/**
 * Margem direita da nota: os cards que o texto gera, com o estado de cada um.
 * Some abaixo de 1100px — quem decide é a página, pelo breakpoint `cards`.
 */
export async function CardMargin({ noteId }: { noteId: string }) {
  const { active, archived } = await listCardsForNote(noteId);

  return (
    <aside
      aria-label="Cards desta nota"
      className="space-y-3 border-l border-rule pl-4 text-sm"
    >
      <h2 className="font-mono text-xs tracking-wide text-ink-soft">
        cards ({active.length})
      </h2>

      {active.length === 0 ? (
        <p className="text-xs text-ink-soft">
          Nenhum card ainda. Escreva uma lacuna entre chaves duplas, ou um par
          Q:: e A::.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </ul>
      )}

      {archived > 0 ? (
        <p className="border-t border-rule pt-2 text-xs text-ink-soft">
          {archived} {archived === 1 ? "card arquivado" : "cards arquivados"},
          com o histórico preservado. Voltam sozinhos se o trecho reaparecer.
        </p>
      ) : null}
    </aside>
  );
}
