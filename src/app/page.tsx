import Link from "next/link";
import { Suspense } from "react";

import { CourseRail } from "@/features/courses/components/course-rail";
import { CaptureNoteButton } from "@/features/notes/components/capture-note-button";
import { createNote } from "@/features/notes/actions";
import {
  lastCaptureLesson,
  listRecentNotes,
} from "@/features/notes/queries";
import { saveLimits } from "@/features/review/actions";
import { LimitsForm } from "@/features/review/components/limits-form";
import { durationLabel } from "@/features/review/duration";
import {
  fetchLimits,
  fetchPanel,
  fetchTodayLabel,
  type Panel,
} from "@/features/review/queries";
import { cn } from "@/shared/cn";
import { Carregando, Shell } from "@/shared/shell";
import { buttonVariants } from "@/shared/ui/button";

/** Quantas notas recentes o painel lista — SPEC §5. */
const RECENTES = 8;

/** As duas caixas do handoff: filete, 24px de respiro, 300px de piso. */
const CAIXAS = "grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6";

function Caixa({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid content-start gap-5 rounded-md border border-rule p-6"
    >
      <h2 id={id} className="text-sm font-medium text-ink-soft">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div>
      <p className="text-2xl leading-none tabular-nums">{valor}</p>
      <p className="mt-1.5 text-sm text-ink-soft">{rotulo}</p>
    </div>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-t border-ink pt-3">
      <dt className="text-xs text-ink-soft">{rotulo}</dt>
      <dd className="mt-1 text-lg">{valor}</dd>
    </div>
  );
}

/** "9 dias seguidos" — o rótulo da métrica já vem completo no handoff. */
function sequencia(n: number): string {
  if (n === 0) return "nenhum dia seguido";
  if (n === 1) return "1 dia seguido";

  return `${n} dias seguidos`;
}

function Metricas({ painel }: { painel: Panel }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-6 gap-y-4">
      <Metrica rotulo="Sequência" valor={sequencia(painel.streakDays)} />
      <Metrica
        rotulo="Tempo mediano por card"
        valor={durationLabel(painel.medianMs)}
      />
    </dl>
  );
}

/* ──────────────────────── as duas caixas e as métricas ───────────────── */

async function Hoje() {
  const [painel, aula] = await Promise.all([
    fetchLimits().then(fetchPanel),
    lastCaptureLesson(),
  ]);

  return (
    <>
      <div className={CAIXAS}>
        <Caixa id="fila-hoje" titulo="Fila de hoje">
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            <Numero
              valor={painel.dueToday}
              rotulo={painel.dueToday === 1 ? "revisão vence" : "revisões vencem"}
            />
            <Numero
              valor={painel.newAvailable}
              rotulo={painel.newAvailable === 1 ? "card novo" : "cards novos"}
            />
          </div>
          <Link
            href="/review"
            className={cn(buttonVariants(), "justify-self-start")}
          >
            Começar revisão
          </Link>
        </Caixa>

        <Caixa id="captura" titulo="Captura">
          {aula === null ? (
            <p className="text-base leading-normal">
              Nenhuma aula cadastrada ainda. Uma nota nasce dentro de uma aula:{" "}
              <Link href="/courses" className="text-accent underline">
                criar o primeiro curso
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="text-base leading-normal">
                Nota nova na aula{" "}
                <Link
                  href={`/lessons/${aula.id}`}
                  className="text-accent underline"
                >
                  {aula.title}
                </Link>
                , aberta direto no editor.
              </p>
              <CaptureNoteButton action={createNote} lessonId={aula.id} />
            </>
          )}
        </Caixa>
      </div>

      <Metricas painel={painel} />
    </>
  );
}

/* ───────────────────────────── últimas notas ─────────────────────────── */

async function Recentes() {
  const notas = await listRecentNotes(RECENTES);

  if (notas.length === 0) {
    return (
      <p className="text-base leading-prose text-ink-soft">
        Nenhuma nota ainda. Comece pela caixa de captura.
      </p>
    );
  }

  return (
    <ul className="border-t border-rule">
      {notas.map((nota) => (
        <li
          key={nota.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-rule py-3"
        >
          <div className="min-w-0">
            <Link
              href={`/notes/${nota.id}`}
              className="text-base font-medium text-accent hover:underline"
            >
              {nota.title}
            </Link>
            <p className="text-xs text-ink-soft">{nota.path}</p>
          </div>
          <span className="text-xs text-ink-soft">{nota.lastEdit}</span>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────────── painel inteiro ────────────────────────── */

async function DataDeHoje() {
  return <span className="text-sm text-ink-soft">{await fetchTodayLabel()}</span>;
}

async function Limites() {
  const limits = await fetchLimits();

  return <LimitsForm action={saveLimits} limits={limits} />;
}

export default function Home() {
  return (
    <Shell rail={<CourseRail />}>
      <div className="grid w-full max-w-220 gap-10">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-xl font-medium">Hoje</h1>
          <Suspense fallback={null}>
            <DataDeHoje />
          </Suspense>
        </header>

        <Suspense
          fallback={
            <div className={CAIXAS}>
              <Caixa id="fila-hoje" titulo="Fila de hoje">
                <Carregando>Contando a fila.</Carregando>
              </Caixa>
              <Caixa id="captura" titulo="Captura">
                <Carregando>Procurando a aula.</Carregando>
              </Caixa>
            </div>
          }
        >
          <Hoje />
        </Suspense>

        <section aria-labelledby="recentes" className="grid gap-2">
          <h2 id="recentes" className="text-sm font-medium text-ink-soft">
            Últimas notas editadas
          </h2>
          <Suspense fallback={<Carregando>Carregando as notas.</Carregando>}>
            <Recentes />
          </Suspense>
        </section>

        <div className="flex justify-end">
          <Suspense fallback={<Carregando>Carregando os limites.</Carregando>}>
            <Limites />
          </Suspense>
        </div>
      </div>
    </Shell>
  );
}
