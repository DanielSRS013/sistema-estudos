"use client";

import { useEffect, useState } from "react";

import { setCardSuspended } from "../actions";
import { destaqueDoTrecho } from "../lines";
import type { NoteCard } from "../queries";
import { CardItem } from "./card-item";
import { SuspendButton } from "./suspend-button";

/** Os blocos de topo do render, pelo `data-line` que o plugin escreveu. */
const ALVOS = ".note-prose [data-line]";

function linhaDe(alvo: Element): number {
  return Number(alvo.getAttribute("data-line"));
}

/**
 * Que linhas da nota estão sob a viewport. Devolve lista vazia enquanto não
 * há nada observado — e aí a margem não apaga card nenhum, que é como ela se
 * comporta sem JavaScript.
 */
function useTrechoVisivel(ativo: boolean): {
  blocos: number[];
  visiveis: number[];
} {
  const [blocos, setBlocos] = useState<number[]>([]);
  const [visiveis, setVisiveis] = useState<number[]>([]);

  useEffect(() => {
    if (!ativo) return;

    let observer: IntersectionObserver | null = null;

    const ligar = (): boolean => {
      const alvos = Array.from(document.querySelectorAll(ALVOS)).filter((alvo) =>
        Number.isFinite(linhaDe(alvo)),
      );

      if (alvos.length === 0) return false;

      setBlocos(alvos.map(linhaDe));

      const sob = new Set<number>();
      const atual = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) sob.add(linhaDe(entry.target));
          else sob.delete(linhaDe(entry.target));
        }

        setVisiveis([...sob]);
      });

      for (const alvo of alvos) atual.observe(alvo);
      observer = atual;

      return true;
    };

    if (ligar()) return () => observer?.disconnect();

    // O corpo da nota chega por outro limite de Suspense: pode não estar na
    // árvore quando a margem monta. Espera ele aparecer, uma vez só.
    const espera = new MutationObserver(() => {
      if (ligar()) espera.disconnect();
    });

    espera.observe(document.body, { childList: true, subtree: true });

    return () => {
      espera.disconnect();
      observer?.disconnect();
    };
  }, [ativo]);

  return { blocos, visiveis };
}

/**
 * A lista da margem: os cards da nota, com o do trecho visível em evidência —
 * SPEC §6. Cliente porque o destaque depende da rolagem; o conteúdo todo vem
 * pronto do servidor, então sem JavaScript a lista continua inteira e legível.
 */
export function CardList({
  cards,
  seguirTrecho = true,
}: {
  cards: NoteCard[];
  /** Fora da margem não há trecho a seguir: a lista sai sem destaque. */
  seguirTrecho?: boolean;
}) {
  const { blocos, visiveis } = useTrechoVisivel(seguirTrecho);
  const noTrecho = destaqueDoTrecho(cards, blocos, visiveis);

  return (
    <ul className="space-y-3">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          apagado={noTrecho !== null && !noTrecho.has(card.id)}
          controle={
            <SuspendButton
              action={setCardSuspended}
              id={card.id}
              suspended={card.suspended}
            />
          }
        />
      ))}
    </ul>
  );
}
