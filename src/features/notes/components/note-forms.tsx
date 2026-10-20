"use client";

import { FolderInput, Plus } from "lucide-react";
import Link from "next/link";
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
  "min-w-0 flex-1 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none";

function Erro({ state }: { state: ActionState }) {
  if (state.ok) return null;

  return (
    <p role="alert" className="text-xs">
      {state.message}
    </p>
  );
}

/** Cria a nota a partir da aula; a action abre o editor na nota nova. */
export function CreateNoteForm({
  action,
  lessonId,
}: {
  action: Action;
  lessonId: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="title"
          placeholder="Título da nota"
          aria-label="Título da nota"
          autoComplete="off"
          className={campo}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          <Plus aria-hidden />
          Criar nota
        </button>
      </div>
      <Erro state={state} />
    </form>
  );
}

/**
 * Atalho de captura do painel: escolhe a aula, nomeia a nota e cai direto no
 * editor. Mesma action da aula — o que muda é que aqui a aula é escolhida, e
 * não herdada da rota.
 */
export function CaptureNoteForm({
  action,
  options,
}: {
  action: Action;
  options: LessonOption[];
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  if (options.length === 0) {
    return (
      <p className="font-serif text-[17px] leading-[1.65] text-ink-soft">
        Nenhuma aula cadastrada ainda. Uma nota nasce dentro de uma aula:{" "}
        <Link href="/courses" className="text-accent underline">
          criar o primeiro curso
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="title"
          placeholder="Título da nota"
          aria-label="Título da nota"
          autoComplete="off"
          className={campo}
        />
        <select
          name="lessonId"
          aria-label="Aula da nota"
          className={cn(campo, "sm:max-w-xs")}
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
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          <Plus aria-hidden />
          Criar e escrever
        </button>
      </div>
      <Erro state={state} />
    </form>
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
          <FolderInput aria-hidden />
          Mover nota
        </button>
      </div>
      <Erro state={state} />
    </form>
  );
}
