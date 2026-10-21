"use client";

import { useActionState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";
import { cn } from "@/shared/cn";
import { buttonVariants } from "@/shared/ui/button";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Título da nota que nasce do painel. O handoff não tem campo de título aqui —
 * a nota abre no editor, onde o título é o primeiro campo e já está à mão.
 */
const SEM_TITULO = "Nota sem título";

/**
 * A captura do painel: um botão só. A aula vem decidida pelo servidor (a da
 * última nota editada), a nota nasce nela e a action abre o editor já dentro.
 */
export function CaptureNoteButton({
  action,
  lessonId,
}: {
  action: Action;
  lessonId: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="grid justify-items-start gap-2">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="title" value={SEM_TITULO} />
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Nova nota
      </button>
      {state.ok ? null : (
        <p role="alert" className="text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}
