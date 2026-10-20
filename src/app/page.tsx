import Link from "next/link";
import { Suspense } from "react";

import { createNote } from "@/features/notes/actions";
import { CaptureNoteForm } from "@/features/notes/components/note-forms";
import { listLessonOptions, listRecentNotes } from "@/features/notes/queries";
import { saveLimits } from "@/features/review/actions";
import { LimitsForm } from "@/features/review/components/limits-form";
import { durationLabel } from "@/features/review/duration";
import { fetchLimits, fetchPanel } from "@/features/review/queries";
import { Carregando } from "@/shared/shell";

/** Quantas notas recentes o painel lista — SPEC §5. */
const RECENTES = 8;

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
  const painel = await fetchPanel(await fetchLimits());

  const temFila = painel.queueSize > 0;

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
        <Numero valor={painel.dueToday} rotulo="vencem hoje" />
        <Numero valor={painel.newAvailable} rotulo="cards novos" />
        <Numero valor={painel.streakDays} rotulo={dias(painel.streakDays)} />
        <Numero valor={painel.doneToday} rotulo="avaliados hoje" />
        <Numero
          valor={durationLabel(painel.medianMs)}
          rotulo="mediana por card"
        />
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

/** Atalho de captura: a nota nasce aqui e a action abre o editor nela. */
async function Captura() {
  const options = await listLessonOptions();

  return <CaptureNoteForm action={createNote} options={options} />;
}

/** Os dois números do SPEC §4, no lugar onde o corte da fila é lido. */
async function Limites() {
  const limits = await fetchLimits();

  return <LimitsForm action={saveLimits} limits={limits} />;
}

async function Recentes() {
  const notas = await listRecentNotes(RECENTES);

  if (notas.length === 0) {
    return (
      <p className="font-serif text-[17px] leading-[1.65] text-ink-soft">
        Nenhuma nota ainda. Comece pelo campo acima.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {notas.map((nota) => (
        <li key={nota.id} className="flex flex-wrap items-baseline gap-x-3">
          <Link
            href={`/notes/${nota.id}`}
            className="min-w-0 rounded-sm text-sm font-medium hover:text-accent focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            {nota.title}
          </Link>
          <span className="min-w-0 truncate font-mono text-xs text-ink-soft">
            {nota.path}
          </span>
          <span className="font-mono text-xs text-ink-soft">
            {nota.lastEdit}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col justify-center gap-10 px-6 py-16 sm:px-10">
      <header className="measure space-y-2">
        <p className="font-mono text-xs tracking-wide text-ink-soft">painel</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hoje</h1>
      </header>

      <Suspense
        fallback={<p className="font-mono text-xs text-ink-soft">contando…</p>}
      >
        <Painel />
      </Suspense>

      <section className="measure space-y-3 border-t border-rule pt-6">
        <h2 className="text-sm font-medium text-ink-soft">Nota nova</h2>
        <Suspense fallback={<Carregando>Carregando as aulas.</Carregando>}>
          <Captura />
        </Suspense>
      </section>

      <section className="measure space-y-3 border-t border-rule pt-6">
        <h2 className="text-sm font-medium text-ink-soft">Últimas notas</h2>
        <Suspense fallback={<Carregando>Carregando as notas.</Carregando>}>
          <Recentes />
        </Suspense>
      </section>

      <section className="measure border-t border-rule pt-6">
        <Suspense fallback={<Carregando>Carregando os limites.</Carregando>}>
          <Limites />
        </Suspense>
      </section>
    </main>
  );
}
