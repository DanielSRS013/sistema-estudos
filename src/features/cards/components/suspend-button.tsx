"use client";

import { useActionState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Tira o card da fila, ou o devolve. Um botão só, porque a ação é o inverso
 * do estado atual — o valor vai no campo escondido, como nos arquivamentos.
 *
 * Botão com texto, como o handoff desenha: 13px sobre filete `--rule`, altura
 * mínima de 32px. Antes era só um ícone de pausa, que não diz o que acontece.
 */
export function SuspendButton({
  action,
  id,
  suspended,
  referencia,
}: {
  action: Action;
  id: string;
  suspended: boolean;
  /** O número do card na nota, para o nome acessível distinguir os botões. */
  referencia: number;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        type="hidden"
        name="suspended"
        value={suspended ? "false" : "true"}
      />
      {/* O rótulo visível é só "Suspender", como no handoff; o nome acessível
          diz de qual card se trata — numa nota de seis cards há seis botões
          iguais, e o `article` não tem nome que os distinga. */}
      <button
        type="submit"
        disabled={pending}
        aria-label={`${suspended ? "Retomar" : "Suspender"} o card ${referencia}`}
        className="min-h-8 rounded-sm border border-rule px-2.5 py-1 text-xs text-ink"
      >
        {suspended ? "Retomar" : "Suspender"}
      </button>
      {state.ok ? null : (
        <span role="alert" className="text-xs">
          {state.message}
        </span>
      )}
    </form>
  );
}
