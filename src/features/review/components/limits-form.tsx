"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";
import { cn } from "@/shared/cn";
import { buttonVariants } from "@/shared/ui/button";

import { MAX_NEW_PER_DAY, MAX_REVIEWS_PER_DAY } from "../schemas";
import type { Limits } from "../scheduler";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const campo =
  "w-20 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink";

/**
 * Lugar discreto para os dois números do SPEC §4: recolhido por padrão, com os
 * valores de hoje visíveis no resumo. Não vira rota — SPEC §5 não tem página
 * de configuração, e o painel é onde o corte da fila é lido.
 */
export function LimitsForm({
  action,
  limits,
}: {
  action: Action;
  limits: Limits;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [visto, setVisto] = useState(state);
  const [salvo, setSalvo] = useState(false);

  // Ajuste em render, não em efeito: cada submissão devolve um estado novo, e
  // só o bem-sucedido confirma na tela.
  if (visto !== state) {
    setVisto(state);
    setSalvo(state.ok);
  }

  return (
    <details className="space-y-3">
      <summary className="cursor-pointer rounded-sm text-sm font-medium text-ink-soft hover:text-ink">
        Limites diários
        <span className="ml-2 font-mono text-xs">
          {limits.newPerDay} {limits.newPerDay === 1 ? "novo" : "novos"} ·{" "}
          {limits.reviewsPerDay}{" "}
          {limits.reviewsPerDay === 1 ? "revisão" : "revisões"}
        </span>
      </summary>

      <form action={formAction} className="space-y-2 pt-3">
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1">
            <span className="block font-mono text-xs text-ink-soft">
              novos por dia
            </span>
            <input
              name="newPerDay"
              type="number"
              min={0}
              max={MAX_NEW_PER_DAY}
              step={1}
              inputMode="numeric"
              defaultValue={limits.newPerDay}
              className={campo}
            />
          </label>
          <label className="space-y-1">
            <span className="block font-mono text-xs text-ink-soft">
              revisões por dia
            </span>
            <input
              name="reviewsPerDay"
              type="number"
              min={0}
              max={MAX_REVIEWS_PER_DAY}
              step={1}
              inputMode="numeric"
              defaultValue={limits.reviewsPerDay}
              className={campo}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          >
            <Check aria-hidden />
            Salvar limites
          </button>
        </div>

        {state.ok ? null : (
          <p role="alert" className="text-xs">
            {state.message}
          </p>
        )}
        {state.ok && salvo ? (
          <p role="status" className="font-mono text-xs text-ink-soft">
            Limites salvos.
          </p>
        ) : null}

        <p className="font-serif text-sm leading-prose text-ink-soft">
          Zero em novos por dia pausa a entrada de cards novos sem mexer no que
          já está em revisão.
        </p>
      </form>
    </details>
  );
}
