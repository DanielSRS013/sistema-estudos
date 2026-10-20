import { Suspense } from "react";

import { ReviewSession } from "@/features/review/components/session";
import { fetchAheadQueue, fetchQueue } from "@/features/review/queries";

export const metadata = { title: "Revisão" };

/**
 * Modo foco: esta rota não usa a `Shell`. Sem rail e sem margem, como manda o
 * SPEC §6 — um card centrado no campo de papel e nada mais na tela.
 */
async function Fila({ ahead }: { ahead: boolean }) {
  const fila = ahead ? await fetchAheadQueue() : await fetchQueue();

  return (
    <ReviewSession
      cards={fila.cards}
      nextDueInDays={fila.nextDueInDays}
      ahead={ahead}
    />
  );
}

export default async function ReviewPage({
  searchParams,
}: PageProps<"/review">) {
  const { adiantado } = await searchParams;

  return (
    <Suspense
      fallback={
        <p className="mx-auto px-6 py-6 font-mono text-xs text-ink-soft">
          montando a fila…
        </p>
      }
    >
      <Fila ahead={adiantado === "1"} />
    </Suspense>
  );
}
