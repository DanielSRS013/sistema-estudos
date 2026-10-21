"use client";

import {
  ArchiveRestore,
  ArchiveX,
  ArrowDown,
  ArrowUp,
  Check,
  CircleCheck,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/cn";

import { idleState, type ActionState } from "@/shared/action-state";

export type Action = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

function Erro({ state }: { state: ActionState }) {
  if (state.ok) return null;

  return (
    <p role="alert" className="text-xs">
      {state.message}
    </p>
  );
}

/** Campos escondidos que todo formulário desta fatia carrega. */
function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

/* ─────────────────────────────── criar ───────────────────────────────── */

export function CreateForm({
  action,
  hidden = {},
  placeholder,
  submitLabel,
  withCourseMeta = false,
}: {
  action: Action;
  hidden?: Record<string, string>;
  placeholder: string;
  submitLabel: string;
  /** Especialização e instituição — só o curso as tem (SPEC §2). */
  withCourseMeta?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={formAction} className="space-y-2">
      <Hidden values={hidden} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="title"
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft"
        />
        {withCourseMeta ? (
          <>
            <input
              name="track"
              placeholder="Especialização (opcional)"
              aria-label="Especialização (opcional)"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft"
            />
            <input
              name="provider"
              placeholder="Instituição (opcional)"
              aria-label="Instituição (opcional)"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft"
            />
          </>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          <Plus aria-hidden />
          {submitLabel}
        </button>
      </div>
      <Erro state={state} />
    </form>
  );
}

/* ────────────────────────────── renomear ─────────────────────────────── */

export function RenameForm({
  action,
  id,
  current,
  children,
}: {
  action: Action;
  id: string;
  current: string;
  /** Como o título aparece quando não está em edição. */
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [editing, setEditing] = useState(false);
  const [visto, setVisto] = useState(state);

  // Ajuste em render, não em efeito: cada submissão devolve um estado novo, e
  // o que foi bem-sucedido fecha o campo de edição.
  if (visto !== state) {
    setVisto(state);
    if (state.ok) setEditing(false);
  }

  if (!editing) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        {children}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Renomear ${current}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-xs" }),
            "text-ink-soft",
          )}
        >
          <Pencil aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <form action={formAction} className="min-w-0 flex-1 space-y-2">
      <Hidden values={{ id }} />
      <div className="flex items-center gap-1.5">
        <input
          name="title"
          defaultValue={current}
          aria-label="Novo título"
          autoFocus
          className="min-w-0 flex-1 rounded-md border border-rule bg-paper px-2 py-1 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Salvar título"
          className={cn(buttonVariants({ size: "icon-xs" }))}
        >
          <Check aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancelar renomeação"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-xs" }),
            "text-ink-soft",
          )}
        >
          <X aria-hidden />
        </button>
      </div>
      <Erro state={state} />
    </form>
  );
}

/* ──────────────────────────── mover e arquivar ───────────────────────── */

export function MoveButtons({
  action,
  id,
  canUp,
  canDown,
  label,
}: {
  action: Action;
  id: string;
  canUp: boolean;
  canDown: boolean;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="flex items-center gap-0.5">
      <Hidden values={{ id }} />
      <button
        type="submit"
        name="direction"
        value="up"
        disabled={pending || !canUp}
        aria-label={`Mover ${label} para cima`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "text-ink-soft",
        )}
      >
        <ArrowUp aria-hidden />
      </button>
      <button
        type="submit"
        name="direction"
        value="down"
        disabled={pending || !canDown}
        aria-label={`Mover ${label} para baixo`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "text-ink-soft",
        )}
      >
        <ArrowDown aria-hidden />
      </button>
      <Erro state={state} />
    </form>
  );
}

export function ArchiveButton({
  action,
  id,
  archived,
  label,
}: {
  action: Action;
  id: string;
  archived: boolean;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <Hidden values={{ id, archived: archived ? "false" : "true" }} />
      <button
        type="submit"
        disabled={pending}
        aria-label={archived ? `Reativar ${label}` : `Arquivar ${label}`}
        title={archived ? "Reativar" : "Arquivar"}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "text-ink-soft",
        )}
      >
        {archived ? <ArchiveRestore aria-hidden /> : <ArchiveX aria-hidden />}
      </button>
      <Erro state={state} />
    </form>
  );
}

/* ───────────────────────────── aula estudada ─────────────────────────── */

/**
 * Marca a aula como estudada, ou desfaz. Botão com texto, não ícone: é a
 * única ação do cabeçalho que muda um fato sobre o estudo, e não um arranjo
 * da árvore — vale dizer por extenso o que acontece.
 */
export function StudiedButton({
  action,
  id,
  studied,
}: {
  action: Action;
  id: string;
  studied: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <Hidden values={{ id, studied: studied ? "false" : "true" }} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          buttonVariants({ variant: studied ? "ghost" : "outline", size: "sm" }),
          studied ? "text-ink-soft" : "",
        )}
      >
        {studied ? <RotateCcw aria-hidden /> : <CircleCheck aria-hidden />}
        {studied ? "Desmarcar" : "Marcar como estudada"}
      </button>
      <Erro state={state} />
    </form>
  );
}
