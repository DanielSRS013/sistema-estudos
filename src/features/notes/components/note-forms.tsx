"use client";

import { useActionState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";
import { cn } from "@/shared/cn";
import { buttonVariants } from "@/shared/ui/button";

import type { LessonOption } from "../queries";

type Action = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

const campo =
  "min-w-0 flex-1 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft";

function Erro({ state }: { state: ActionState }) {
  if (state.ok) return null;

  return (
    <p role="alert" className="text-xs">
      {state.message}
    </p>
  );
}

/** Move a nota para outra aula. */
export function MoveNoteForm({
  action,
  noteId,
  currentLessonId,
  options,
}: {
  action: Action;
  noteId: string;
  currentLessonId: string;
  options: LessonOption[];
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={noteId} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="lessonId"
          defaultValue={currentLessonId}
          aria-label="Aula de destino"
          className={campo}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.path}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0",
          )}
        >
          Mover nota
        </button>
      </div>
      <Erro state={state} />
    </form>
  );
}
