"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { MathMarkdown } from "@/shared/markdown";
import { marcarLacuna } from "@/shared/markdown-cloze";

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
    label: "De novo",
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

/** Quanto tempo "Avaliação desfeita" fica na tela, em ms. */
const AVISO_MS = 2_500;

/** A coluna do modo foco: 720px, a mesma na fila, no vazio e na espera. */
const COLUNA = "mx-auto w-full max-w-180";

/* ─────────────────────────────── vazio ───────────────────────────────── */

/** `null` quando nada está agendado: aí a linha simplesmente não aparece. */
function proximaRevisao(dias: number | null): string | null {
  if (dias === null) return null;
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
  const proxima = proximaRevisao(nextDueInDays);

  return (
    <div className={`${COLUNA} flex flex-1 flex-col justify-center gap-3`}>
      <h1 className="font-serif text-xl leading-snug font-medium">
        Nada vence hoje.
      </h1>
      {proxima === null ? null : (
        <p className="text-base text-ink-soft">{proxima}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
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

/** Atalho não dispara com o foco num campo — exigência do handoff. */
function emCampo(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;

  return (
    alvo.isContentEditable ||
    alvo.tagName === "INPUT" ||
    alvo.tagName === "TEXTAREA" ||
    alvo.tagName === "SELECT"
  );
}

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
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  // Quando a resposta apareceu, para medir o tempo de pensamento.
  const reveladoEm = useRef<number | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const atual = fila[0];

  const anunciar = useCallback((texto: string) => {
    setAviso(texto);

    if (avisoTimer.current !== null) clearTimeout(avisoTimer.current);

    avisoTimer.current = setTimeout(() => {
      setAviso(null);
      avisoTimer.current = null;
    }, AVISO_MS);
  }, []);

  // O timer não pode disparar depois de a sessão sair da tela.
  useEffect(
    () => () => {
      if (avisoTimer.current !== null) clearTimeout(avisoTimer.current);
    },
    [],
  );

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

        // "De novo" devolve o card ao fim da fila da sessão: o FSRS marcou
        // para daqui a poucos minutos, e é hoje que ele precisa ser revisto.
        setFila((anterior) => {
          const resto = anterior.slice(1);
          return rating === "again" ? [...resto, card] : resto;
        });
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
      // O card volta com a resposta à vista, como o handoff pede: desfazer é
      // para corrigir a nota que acabou de ser dada, não para reler a frente.
      setRevelado(true);
      reveladoEm.current = performance.now();
      anunciar("Avaliação desfeita");
    });
  }, [anunciar, pendente]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;
      if (emCampo(evento.target)) return;

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

  // Cloze revela in-loco: a resposta ocupa o lugar da lacuna, na mesma frase.
  // Pergunta/resposta revela abaixo do filete, e aí a frente não muda.
  const cloze = atual?.kind === "cloze";
  const face = atual === undefined ? "" : montarFace(atual, cloze, revelado);

  const rodape = aviso ?? rodapeDe(atual === undefined, revelado);

  return (
    <main className="flex min-h-dvh flex-col px-4 pt-4 pb-5 rail:px-14 rail:pt-7 rail:pb-10">
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span>{atual?.path ?? ""}</span>
        <span>
          {atual === undefined ? "Fila concluída" : `Restam ${fila.length}`}
        </span>
      </div>

      {atual === undefined ? (
        <Vazio nextDueInDays={nextDueInDays} ahead={ahead} />
      ) : (
        <div
          className={`${COLUNA} flex flex-1 flex-col justify-center gap-7 py-10`}
        >
          <MathMarkdown
            content={face}
            className="card-face text-xl"
            {...(cloze ? { lacuna: revelado ? "revelada" : "oculta" } : {})}
          />

          {revelado && !cloze ? (
            <div className="border-t border-rule pt-6">
              <MathMarkdown
                content={atual.answer}
                className="card-face text-xl"
              />
            </div>
          ) : null}
        </div>
      )}

      <div className={`${COLUNA} grid gap-4`}>
        {erro === null ? null : (
          <p role="alert" className="text-sm">
            {erro}
          </p>
        )}

        {atual === undefined ? null : revelado ? (
          <div
            role="group"
            aria-label="Avaliar o card"
            className="grid grid-cols-4 gap-2"
          >
            {BOTOES.map((botao) => (
              <button
                key={botao.rating}
                type="button"
                disabled={pendente}
                onClick={() => avaliar(botao.rating)}
                className={`flex min-h-18 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 disabled:opacity-50 ${botao.cor}`}
              >
                <span className="text-base font-medium">{botao.label}</span>
                <span className="text-xs">{botao.tecla}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={revelar}
            className="flex min-h-18 w-full flex-col items-center justify-center gap-0.5 rounded-md bg-ink text-paper"
          >
            <span className="text-base font-medium">Mostrar resposta</span>
            <span className="text-xs">espaço</span>
          </button>
        )}

        <p role="status" className="text-center text-xs text-ink-soft">
          {rodape}
        </p>
      </div>
    </main>
  );
}

function montarFace(card: QueueCard, cloze: boolean, revelado: boolean): string {
  if (!cloze) return card.prompt;

  return revelado
    ? marcarLacuna(card.prompt, card.answer)
    : marcarLacuna(card.prompt);
}

function rodapeDe(vazia: boolean, revelado: boolean): string {
  if (vazia) return "esc volta ao painel";

  return revelado ? "u desfaz · esc sai" : "esc sai";
}
