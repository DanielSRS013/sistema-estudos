import { listCardsForNote } from "../queries";
import { CardsDisclosure } from "./cards-disclosure";
import { NoteCardBox } from "./note-card";

/**
 * Os cards da nota abaixo de 1100px, onde a margem some — SPEC §6 tira a
 * coluna, não o acesso. Seção recolhível ao fim da nota, em grade que se
 * reparte sozinha a partir de 240px por card.
 *
 * Sem `id` nos cards: a âncora `#cN` que o corpo da nota escreve é da cópia da
 * margem, e dois `id` iguais na mesma página não são `id`.
 */
export async function NoteCardsSection({ noteId }: { noteId: string }) {
  const { active } = await listCardsForNote(noteId);

  if (active.length === 0) return null;

  return (
    <section className="border-t border-rule cards:hidden">
      <CardsDisclosure total={active.length}>
        {active.map((card) => (
          <NoteCardBox key={card.id} card={card} />
        ))}
      </CardsDisclosure>
    </section>
  );
}
