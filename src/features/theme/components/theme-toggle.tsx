"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { CLASSE_ITEM_RODAPE } from "@/shared/rail-item";

import {
  CHAVE_TEMA,
  CONSULTA_ESCURO,
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

function prefereEscuro(): boolean {
  return window.matchMedia(CONSULTA_ESCURO).matches;
}

/** O tema que está na tela agora, resolvido: a classe que o `<html>` carrega. */
function escuroNaTela(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Aplica a classe resolvida no `<html>`, do mesmo jeito que o script inline. */
function aplicar(tema: Tema): void {
  const classe = classeDoTema(tema, prefereEscuro());
  const lista = document.documentElement.classList;

  lista.remove(classe === "dark" ? "light" : "dark");
  lista.add(classe);
}

/**
 * Controle de tema no pé do rail: um botão só, que diz para onde vai — "Tema
 * escuro" quando está claro, "Tema claro" quando está escuro. A opção
 * "sistema" sai da interface, como o handoff desenha, e segue sendo o estado
 * inicial de quem nunca escolheu: o primeiro clique parte do tema que está na
 * tela, não da escolha gravada.
 *
 * O `/review` não ganha controle nenhum: o modo foco continua sem interface
 * (SPEC §6).
 */
export function ThemeToggle() {
  const tema = useSyncExternalStore(assinar, temaGravado, temaDoServidor);

  const alternar = useCallback(() => {
    const proximo: Tema = escuroNaTela() ? "claro" : "escuro";

    try {
      window.localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // A troca vale para esta sessão e não é lembrada.
    }

    aplicar(proximo);
    window.dispatchEvent(new Event(EVENTO_TEMA));
  }, []);

  // Em "sistema", trocar o tema do sistema operacional troca a página na hora.
  useEffect(() => {
    if (tema !== "sistema") return;

    const consulta = window.matchMedia(CONSULTA_ESCURO);
    const responder = () => aplicar("sistema");

    consulta.addEventListener("change", responder);

    return () => consulta.removeEventListener("change", responder);
  }, [tema]);

  return (
    <button type="button" onClick={alternar} className={CLASSE_ITEM_RODAPE}>
      {/* O rótulo sai da classe do `<html>`, não de estado hidratado: o script
          do layout já escreveu `.dark` antes da pintura, então no escuro o
          botão nunca nasce dizendo "Tema escuro" para só então se corrigir. O
          irmão escondido é `display:none` — leitor de tela anuncia um só. */}
      <span className="dark:hidden">Tema escuro</span>
      <span className="hidden dark:inline">Tema claro</span>
    </button>
  );
}
