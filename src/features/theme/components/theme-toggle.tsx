"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { cn } from "@/shared/cn";

import {
  CHAVE_TEMA,
  CONSULTA_ESCURO,
  TEMAS,
  TEMA_PADRAO,
  classeDoTema,
  lerTema,
  type Tema,
} from "../theme";

/**
 * O `localStorage` é um sistema externo ao React: a escolha é lida por
 * `useSyncExternalStore`, não por estado hidratado dentro de um efeito. Como
 * ele não avisa a própria aba, a troca local anuncia por um evento nosso; o
 * `storage` nativo cobre a mesma escolha feita em outra aba.
 */
const EVENTO_TEMA = "tema:mudou";

function assinar(avisar: () => void): () => void {
  window.addEventListener(EVENTO_TEMA, avisar);
  window.addEventListener("storage", avisar);

  return () => {
    window.removeEventListener(EVENTO_TEMA, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function temaGravado(): Tema {
  try {
    return lerTema(window.localStorage.getItem(CHAVE_TEMA));
  } catch {
    // Navegação privada ou armazenamento bloqueado: o controle funciona
    // igual, só não lembra da escolha.
    return TEMA_PADRAO;
  }
}

/** No servidor não há aparelho: o padrão é seguir o sistema. */
function temaDoServidor(): Tema {
  return TEMA_PADRAO;
}

/** Aplica a classe resolvida no `<html>`, do mesmo jeito que o script inline. */
function aplicar(tema: Tema): void {
  const prefereEscuro = window.matchMedia(CONSULTA_ESCURO).matches;
  const classe = classeDoTema(tema, prefereEscuro);
  const lista = document.documentElement.classList;

  lista.remove(classe === "dark" ? "light" : "dark");
  lista.add(classe);
}

/**
 * Controle de tema no pé do rail, ao lado de sair. O `/review` não ganha
 * controle nenhum: o modo foco continua sem interface (SPEC §6).
 */
export function ThemeToggle() {
  const tema = useSyncExternalStore(assinar, temaGravado, temaDoServidor);

  // Em "sistema", trocar o tema do sistema operacional troca a página na hora.
  useEffect(() => {
    if (tema !== "sistema") return;

    const consulta = window.matchMedia(CONSULTA_ESCURO);
    const responder = () => aplicar("sistema");

    consulta.addEventListener("change", responder);

    return () => consulta.removeEventListener("change", responder);
  }, [tema]);

  const escolher = useCallback((proximo: Tema) => {
    try {
      window.localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // A troca vale para esta sessão e não é lembrada.
    }

    aplicar(proximo);
    window.dispatchEvent(new Event(EVENTO_TEMA));
  }, []);

  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex items-center gap-2 font-mono text-xs tracking-wide"
    >
      {TEMAS.map((opcao) => {
        const ativo = opcao === tema;

        return (
          <button
            key={opcao}
            type="button"
            onClick={() => escolher(opcao)}
            aria-pressed={ativo}
            className={cn(
              "rounded-sm px-1 text-ink-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none",
              ativo && "text-accent",
            )}
          >
            {opcao}
          </button>
        );
      })}
    </div>
  );
}
