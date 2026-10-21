"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { MathMarkdown } from "@/shared/markdown";

import { rateCard, undoLast } from "../actions";
import type { QueueCard } from "../queries";
import type { Rating } from "../scheduler";

/**
 * Os quatro botões, nas paradas do viridis (SPEC §6). É o único lugar do app
 * onde a cor carrega informação. O amarelo do Easy não tem contraste para
 * texto claro, então leva `--ink` por cima — nunca `--paper`.
 */
const BOTOES: {
  rating: Rating;
  label: string;
  tecla: string;
  cor: string;
}[] = [
  {
    rating: "again",
    label: "Errei",
    tecla: "1",
    cor: "bg-again text-viridis-paper",
  },
  {
    rating: "hard",
    label: "Difícil",
    tecla: "2",
    cor: "bg-hard text-viridis-paper",
  },
  { rating: "good", label: "Bom", tecla: "3", cor: "bg-good text-viridis-ink" },
  { rating: "easy", label: "Fácil", tecla: "4", cor: "bg-easy text-viridis-ink" },
];

const TECLAS: Record<string, Rating> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
};

/* ─────────────────────────────── vazio ───────────────────────────────── */

function proximaRevisao(dias: number | null): string {
  if (dias === null) return "Nenhum card espera revisão.";
  if (dias === 0) return "A próxima revisão é ainda hoje.";
  if (dias === 1) return "Próxima revisão amanhã.";

  return `Próxima revisão em ${dias} dias.`;
}

function Vazio({
  nextDueInDays,
  ahead,
}: {
  nextDueInDays: number | null;
  ahead: boolean;
}) {
  return (
    <div className="measure space-y-4">
      <h1 className="font-serif text-xl leading-snug">
        {ahead ? "Nada para adiantar." : "Nada vence hoje."}
      </h1>
      <p className="font-serif text-base leading-prose text-ink-soft">
        {proximaRevisao(nextDueInDays)}
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        {ahead || nextDueInDays === null ? null : (
          <Link href="/review?adiantado=1" className="text-accent underline">
            Estudar adiantado
          </Link>
        )}
        <Link href="/" className="text-accent underline">
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────── sessão ───────────────────────────────── */

export function ReviewSession({
  cards,
  nextDueInDays,
  ahead = false,
}: {
  cards: QueueCard[];
  nextDueInDays: number | null;
  ahead?: boolean;
}) {
  const router = useRouter();

  const [fila, setFila] = useState(cards);
  const [revelado, setRevelado] = useState(false);
  const [avaliados, setAvaliados] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  // Quando a resposta apareceu, para medir o tempo de pensamento.
  const reveladoEm = useRef<number | null>(null);

  const atual = fila[0];

  const revelar = useCallback(() => {
    if (revelado) return;

    reveladoEm.current = performance.now();
    setRevelado(true);
  }, [revelado]);

  const avaliar = useCallback(
    (rating: Rating) => {
      if (atual === undefined || pendente || !revelado) return;

      const card = atual;
      const inicio = reveladoEm.current;
      const durationMs =
        inicio === null
          ? undefined
          : Math.min(3_600_000, Math.round(performance.now() - inicio));

      setErro(null);

      startTransition(async () => {
        const resultado = await rateCard({
          cardId: card.id,
          rating,
          ...(durationMs === undefined ? {} : { durationMs }),
        });

        if (!resultado.ok) {
          setErro(resultado.message);
          return;
        }

        // "Errei" devolve o card ao fim da fila da sessão: o FSRS marcou para
        // daqui a poucos minutos, e é hoje que ele precisa ser revisto.
        setFila((anterior) => {
          const resto = anterior.slice(1);
          return rating === "again" ? [...resto, card] : resto;
        });
        setAvaliados((n) => n + 1);
        setRevelado(false);
        reveladoEm.current = null;
      });
    },
    [atual, pendente, revelado],
  );

  const desfazer = useCallback(() => {
    if (pendente) return;

    setErro(null);

    startTransition(async () => {
      const resultado = await undoLast();

      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }

      const card = resultado.card;

      setFila((anterior) => [
        card,
        ...anterior.filter((outro) => outro.id !== card.id),
      ]);
      setAvaliados((n) => Math.max(0, n - 1));
      setRevelado(false);
      reveladoEm.current = null;
    });
  }, [pendente]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;

      if (evento.key === "Escape") {
        router.push("/");
        return;
      }

      if (evento.key === "u" || evento.key === "U") {
        evento.preventDefault();
        desfazer();
        return;
      }

      if (evento.key === " ") {
        // Sem isto a barra rola a página sob o card.
        evento.preventDefault();
        revelar();
        return;
      }

      const rating = TECLAS[evento.key];

      if (rating !== undefined) {
        evento.preventDefault();
        avaliar(rating);
      }
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [avaliar, desfazer, revelar, router]);

  /* ──────────────────────────── render ──────────────────────────── */

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[46rem] flex-col px-6 py-6 sm:px-10">
      <header className="flex items-baseline justify-between gap-4 font-mono text-xs text-ink-soft">
        <p>
          {ahead ? "adiantando · " : ""}
          {fila.length > 0
            ? `${fila.length} na fila · ${avaliados} ${avaliados === 1 ? "avaliado" : "avaliados"}`
            : `${avaliados} ${avaliados === 1 ? "avaliado" : "avaliados"}`}
        </p>
        <Link href="/" className="underline">
          esc sai
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        {atual === undefined ? (
          <Vazio nextDueInDays={nextDueInDays} ahead={ahead} />
        ) : (
          <article className="space-y-8">
            <MathMarkdown
              content={atual.prompt}
              className="card-face font-serif text-xl"
            />

            {revelado ? (
              <div className="space-y-6 border-t border-rule pt-8">
                <MathMarkdown
                  content={atual.answer}
                  className="card-face font-serif text-lg"
                />
                <p className="font-mono text-xs text-ink-soft">
                  {atual.noteTitle}
                </p>
              </div>
            ) : (
              <div className="space-y-6 border-t border-rule pt-8">
                {atual.hint === null ? null : (
                  <p className="font-serif text-base text-ink-soft">
                    {atual.hint}
                  </p>
                )}
                <button
                  type="button"
                  onClick={revelar}
                  className="rounded-md border border-rule px-4 py-2 font-sans text-sm text-ink"
                >
                  Revelar resposta
                  <span className="ml-2 font-mono text-xs text-ink-soft">
                    espaço
                  </span>
                </button>
              </div>
            )}
          </article>
        )}
      </div>

      <footer className="space-y-3">
        {erro === null ? null : (
          <p role="alert" className="font-sans text-sm">
            {erro}
          </p>
        )}

        {atual === undefined || !revelado ? null : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BOTOES.map((botao) => (
              <button
                key={botao.rating}
                type="button"
                disabled={pendente}
                onClick={() => avaliar(botao.rating)}
                className={`flex flex-col items-center gap-0.5 rounded-md px-4 py-3 font-sans text-sm font-medium disabled:opacity-50 ${botao.cor}`}
              >
                {botao.label}
                <span className="font-mono text-xs opacity-80">
                  {botao.tecla}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between font-mono text-xs text-ink-soft">
          <button
            type="button"
            onClick={desfazer}
            disabled={pendente}
            className="underline disabled:opacity-50"
          >
            u desfaz a última avaliação
          </button>
          {pendente ? <span>gravando…</span> : null}
        </div>
      </footer>
    </main>
  );
}
