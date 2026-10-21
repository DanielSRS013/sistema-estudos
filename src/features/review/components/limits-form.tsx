"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";

import { MAX_NEW_PER_DAY, MAX_REVIEWS_PER_DAY } from "../schemas";
import type { Limits } from "../scheduler";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const campo =
  "w-18 min-h-8 rounded-md border border-rule bg-paper px-1.5 py-1 text-xs text-ink";

/**
 * Quanto a digitação espera antes de gravar. "Salva ao alterar" com `onChange`
 * cru gravaria 1 e depois 15 enquanto o usuário escreve "15"; meio segundo de
 * silêncio é o que separa uma tecla da intenção.
 */
const ESPERA_MS = 600;

/**
 * Os dois números do SPEC §4 no canto do painel, sempre visíveis e sem botão —
 * o handoff grava ao alterar e confirma com "Salvo". Não vira rota: SPEC §5
 * não tem página de configuração, e o painel é onde o corte da fila é lido.
 */
export function LimitsForm({
  action,
  limits,
}: {
  action: Action;
  limits: Limits;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [visto, setVisto] = useState(state);
  const [salvo, setSalvo] = useState(false);

  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ajuste em render, não em efeito: cada gravação devolve um estado novo, e
  // só a bem-sucedida confirma na tela.
  if (visto !== state) {
    setVisto(state);
    setSalvo(state.ok);
  }

  // O debounce não pode disparar depois de o painel sair da tela.
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function aoAlterar() {
    if (timer.current !== null) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      timer.current = null;
      form.current?.requestSubmit();
    }, ESPERA_MS);
  }

  return (
    <form
      ref={form}
      action={formAction}
      role="group"
      aria-label="Limites diários"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft"
    >
      <span>Limites diários</span>

      <label className="flex items-center gap-1.5">
        Novos
        <input
          name="newPerDay"
          type="number"
          min={0}
          max={MAX_NEW_PER_DAY}
          step={1}
          inputMode="numeric"
          defaultValue={limits.newPerDay}
          onChange={aoAlterar}
          className={campo}
        />
      </label>

      <label className="flex items-center gap-1.5">
        Revisões
        <input
          name="reviewsPerDay"
          type="number"
          min={0}
          max={MAX_REVIEWS_PER_DAY}
          step={1}
          inputMode="numeric"
          defaultValue={limits.reviewsPerDay}
          onChange={aoAlterar}
          className={campo}
        />
      </label>

      {/* Permanente: um `role=status` que nasce junto com a confirmação não é
          lido por leitor de tela nenhum. */}
      <span role="status">{salvo ? "Salvo" : ""}</span>

      {state.ok ? null : (
        <span role="alert" className="text-ink">
          {state.message}
        </span>
      )}
    </form>
  );
}
