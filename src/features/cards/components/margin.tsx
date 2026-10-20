import { listCardsForNote, type NoteCards } from "../queries";
import { CardList } from "./card-list";

const VAZIO =
  "Nenhum card ainda. Escreva uma lacuna entre chaves duplas, ou um par Q:: e A::.";

function Rodape({ active, archived }: NoteCards) {
  const suspensos = active.filter((card) => card.suspended).length;

  return (
    <>
      {suspensos > 0 ? (
        <p className="border-t border-rule pt-2 text-xs text-ink-soft">
          {suspensos === 1
            ? "1 card suspenso: fora da fila, com reps e vencimento onde estavam."
            : `${suspensos} cards suspensos: fora da fila, com reps e vencimento onde estavam.`}
        </p>
      ) : null}

      {archived > 0 ? (
        <p className="border-t border-rule pt-2 text-xs text-ink-soft">
          {archived} {archived === 1 ? "card arquivado" : "cards arquivados"},
          com o histórico preservado. Voltam sozinhos se o trecho reaparecer.
        </p>
      ) : null}
    </>
  );
}

/**
 * Margem direita da nota: os cards que o texto gera, com o estado de cada um
 * e o trecho visível em evidência. Some abaixo de 1100px — quem decide é a
 * página, pelo breakpoint `cards`, e lá embaixo quem mostra os mesmos cards é
 * `NoteCardsSection`.
 */
export async function CardMargin({ noteId }: { noteId: string }) {
  const cards = await listCardsForNote(noteId);

  return (
    <aside
      aria-label="Cards desta nota"
      className="space-y-3 border-l border-rule pl-4 text-sm"
    >
      <h2 className="font-mono text-xs tracking-wide text-ink-soft">
        cards ({cards.active.length})
      </h2>

      {cards.active.length === 0 ? (
        <p className="text-xs text-ink-soft">{VAZIO}</p>
      ) : (
        <CardList cards={cards.active} />
      )}

      <Rodape {...cards} />
    </aside>
  );
}

/**
 * Os mesmos cards abaixo de 1100px, onde não há margem: seção recolhida ao fim
 * da nota. A margem some, os cards não — SPEC §6 tira a coluna, não o acesso.
 *
 * Sem destaque por trecho: sem margem ao lado do texto, não há o que seguir.
 */
export async function NoteCardsSection({ noteId }: { noteId: string }) {
  const cards = await listCardsForNote(noteId);

  return (
    <details className="border-t border-rule pt-4 cards:hidden">
      <summary className="cursor-pointer text-sm font-medium text-ink-soft">
        Cards desta nota ({cards.active.length})
      </summary>

      <div className="space-y-3 pt-3 text-sm">
        {cards.active.length === 0 ? (
          <p className="text-xs text-ink-soft">{VAZIO}</p>
        ) : (
          <CardList cards={cards.active} seguirTrecho={false} />
        )}

        <Rodape {...cards} />
      </div>
    </details>
  );
}
