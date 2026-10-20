import Link from "next/link";
import { Suspense } from "react";

import { fetchPanel } from "@/features/review/queries";

function Numero({
  valor,
  rotulo,
}: {
  valor: number | string;
  rotulo: string;
}) {
  return (
    <div className="space-y-1">
      <p className="font-sans text-[38px] leading-none tracking-tight">
        {valor}
      </p>
      <p className="font-mono text-xs text-ink-soft">{rotulo}</p>
    </div>
  );
}

function dias(n: number): string {
  if (n === 0) return "nenhum dia seguido";
  if (n === 1) return "dia seguido";

  return "dias seguidos";
}

async function Painel() {
  const painel = await fetchPanel();

  const temFila = painel.queueSize > 0;

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        <Numero valor={painel.dueToday} rotulo="vencem hoje" />
        <Numero valor={painel.newAvailable} rotulo="cards novos" />
        <Numero valor={painel.streakDays} rotulo={dias(painel.streakDays)} />
        <Numero valor={painel.doneToday} rotulo="avaliados hoje" />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
        {temFila ? (
          <Link
            href="/review"
            className="rounded-md bg-accent px-4 py-2 font-sans text-sm font-medium text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Revisar {painel.queueSize}{" "}
            {painel.queueSize === 1 ? "card" : "cards"}
          </Link>
        ) : (
          <p className="font-serif text-[17px] leading-[1.65] text-ink-soft">
            Nada vence hoje.{" "}
            {painel.nextDueInDays === null
              ? "Nenhum card espera revisão."
              : painel.nextDueInDays === 1
                ? "Próxima revisão amanhã."
                : `Próxima revisão em ${painel.nextDueInDays} dias.`}{" "}
            <Link href="/review?adiantado=1" className="text-accent underline">
              Estudar adiantado
            </Link>
          </p>
        )}

        <Link href="/courses" className="text-sm text-accent underline">
          Cursos e aulas
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col justify-center gap-10 px-6 py-16 sm:px-10">
      <header className="measure space-y-2">
        <p className="font-mono text-xs tracking-wide text-ink-soft">painel</p>
        <h1 className="text-3xl font-semibold tracking-tight">Hoje</h1>
      </header>

      <Suspense
        fallback={<p className="font-mono text-xs text-ink-soft">contando…</p>}
      >
        <Painel />
      </Suspense>
    </main>
  );
}
