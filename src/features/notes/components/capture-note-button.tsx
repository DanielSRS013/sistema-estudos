"use client";

import { useActionState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";
import { cn } from "@/shared/cn";
import { buttonVariants } from "@/shared/ui/button";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Título da nota que nasce de um botão. O handoff não tem campo de título nem
 * no painel nem na aula — a nota abre no editor, onde o título é o primeiro
 * campo e já está à mão.
 */
const SEM_TITULO = "Nota sem título";

/**
 * A nota que nasce de um botão só: a captura do painel e o "Nova nota" da
 * aula. A aula vem decidida por quem chama (a da última nota editada, no
 * painel; a da tela, na aula), a nota nasce nela e a action abre o editor já
 * dentro.
 *
 * `inline` é o convite da aula sem notas, que mora no meio de uma frase: ali
 * o botão é um link de texto, não um retângulo.
 */
export function CaptureNoteButton({
  action,
  lessonId,
  label = "Nova nota",
  variant = "outline",
  inline = false,
}: {
  action: Action;
  lessonId: string;
  label?: string;
  variant?: "default" | "outline";
  inline?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      className={inline ? "inline" : "grid justify-items-start gap-2"}
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="title" value={SEM_TITULO} />
      <button
        type="submit"
        disabled={pending}
        className={
          inline
            ? "text-accent underline underline-offset-4"
            : cn(buttonVariants({ variant }))
        }
      >
        {label}
      </button>
      {state.ok ? null : (
        <p role="alert" className="text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}
