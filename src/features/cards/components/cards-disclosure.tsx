"use client";

import { useState } from "react";

/**
 * A seção de cards do fim da nota abaixo de 1100px, onde não há margem.
 *
 * Era um `details` com `summary`: o resumo não emite `aria-expanded`, e o
 * handoff pede um botão com o glifo ▸/▾ e o estado anunciado. Cliente só por causa do
 * estado de abertura — os cards vêm prontos do servidor como filhos.
 */
export function CardsDisclosure({
  total,
  children,
}: {
  total: number;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((estava) => !estava)}
        className="flex min-h-11 items-center gap-2 text-sm font-medium text-ink"
      >
        <span aria-hidden className="w-3 text-ink-soft">
          {aberto ? "▾" : "▸"}
        </span>
        Cards desta nota ({total})
      </button>

      {aberto ? <div className="note-cards-lista">{children}</div> : null}
    </>
  );
}
