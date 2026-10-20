import { Suspense } from "react";

import { ReviewSession } from "@/features/review/components/session";
import {
  fetchAheadQueue,
  fetchLimits,
  fetchQueue,
} from "@/features/review/queries";

export const metadata = { title: "Revisão" };

/**
 * Modo foco: esta rota não usa a `Shell`. Sem rail e sem margem, como manda o
 * SPEC §6 — um card centrado no campo de papel e nada mais na tela.
 */
async function Fila({
  searchParams,
}: {
  searchParams: PageProps<"/review">["searchParams"];
}) {
  const { adiantado } = await searchParams;
  const ahead = adiantado === "1";
  // O modo adiantado ignora os limites de propósito (SPEC §4 corta a fila do
  // dia, não o estudo pedido na mão).
  const fila = ahead
    ? await fetchAheadQueue()
    : await fetchQueue(await fetchLimits());

  return (
    <ReviewSession
      cards={fila.cards}
      nextDueInDays={fila.nextDueInDays}
      ahead={ahead}
    />
  );
}

/**
 * `searchParams` é lido dentro do Suspense, não aqui: com `cacheComponents`
 * ligado, a leitura solta no corpo da página aborta o prerender da rota.
 */
export default function ReviewPage({ searchParams }: PageProps<"/review">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto px-6 py-6 font-mono text-xs text-ink-soft">
          montando a fila…
        </p>
      }
    >
      <Fila searchParams={searchParams} />
    </Suspense>
  );
}
