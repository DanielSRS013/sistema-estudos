"use client";

import { PauseCircle, PlayCircle } from "lucide-react";
import { useActionState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";
import { cn } from "@/shared/cn";
import { buttonVariants } from "@/shared/ui/button";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Tira o card da fila, ou o devolve. Um botão só, porque a ação é o inverso
 * do estado atual — o valor vai no campo escondido, como nos arquivamentos.
 */
export function SuspendButton({
  action,
  id,
  suspended,
}: {
  action: Action;
  id: string;
  suspended: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input
        type="hidden"
        name="suspended"
        value={suspended ? "false" : "true"}
      />
      <button
        type="submit"
        disabled={pending}
        aria-label={suspended ? "Retomar card" : "Suspender card"}
        title={suspended ? "Retomar" : "Suspender"}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "text-ink-soft",
        )}
      >
        {suspended ? <PlayCircle aria-hidden /> : <PauseCircle aria-hidden />}
      </button>
      {state.ok ? null : (
        <span role="alert" className="text-xs text-destructive">
          {state.message}
        </span>
      )}
    </form>
  );
}
