"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { idleState, type ActionState } from "@/shared/action-state";
import { cn } from "@/shared/cn";
import { buttonVariants } from "@/shared/ui/button";

export type Action = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

/** Campo de texto das três telas — o mesmo de `note-forms.tsx`. */
const campo =
  "min-w-0 flex-1 rounded-sm border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft";

/** Campo em edição: o filete vira accent enquanto o cursor está nele. */
const campoEmEdicao =
  "min-w-0 flex-1 rounded-sm border border-accent bg-paper px-2 py-1 text-sm text-ink";

/**
 * Botão de ação de linha: 13px, filete `--rule`, alvo de 32px. É o degrau
 * abaixo do botão do handoff (44px, 15/500) e não existe no registry — lá o
 * tamanho pequeno vem com altura de 28px e raio próprio.
 */
export const acao =
  "inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-sm border border-rule px-2 text-xs text-ink disabled:opacity-50";

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
  onDone,
}: {
  action: Action;
  hidden?: Record<string, string>;
  placeholder: string;
  submitLabel: string;
  /** Especialização e instituição — só o curso as tem (SPEC §2). */
  withCourseMeta?: boolean;
  /** Fecha quem abriu o formulário, quando a criação dá certo. */
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form ref={form} action={formAction} className="w-full space-y-2">
      <Hidden values={hidden} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="title"
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          autoFocus
          className={campo}
        />
        {withCourseMeta ? (
          <>
            <input
              name="track"
              placeholder="Especialização (opcional)"
              aria-label="Especialização (opcional)"
              autoComplete="off"
              className={campo}
            />
            <input
              name="provider"
              placeholder="Instituição (opcional)"
              aria-label="Instituição (opcional)"
              autoComplete="off"
              className={campo}
            />
          </>
        ) : null}
        <button type="submit" disabled={pending} className={acao}>
          {submitLabel}
        </button>
      </div>
      <Erro state={state} />
    </form>
  );
}

/**
 * O botão do cabeçalho e o formulário que ele revela.
 *
 * O handoff desenha só o botão — "Novo curso", "Novo módulo", "Nova aula" —, e
 * não diz onde o nome é digitado. Revelar o campo embaixo do botão é o que não
 * inventa tela: não há modal em lugar nenhum do pacote de design, e o campo
 * sempre visível é justamente o que esta fatia tira do alto da página.
 *
 * `display: contents` deixa o botão e o formulário serem itens do flex do
 * cabeçalho: o botão fica na linha do `h1` e o formulário, com largura cheia,
 * cai para a linha de baixo.
 */
export function CreateDisclosure({
  buttonLabel,
  variant = "outline",
  ...form
}: {
  buttonLabel: string;
  variant?: "default" | "outline";
  action: Action;
  hidden?: Record<string, string>;
  placeholder: string;
  submitLabel: string;
  withCourseMeta?: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="contents">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((valor) => !valor)}
        className={cn(buttonVariants({ variant }))}
      >
        {buttonLabel}
      </button>
      {aberto ? <CreateForm {...form} onDone={() => setAberto(false)} /> : null}
    </div>
  );
}

/* ────────────────────────────── renomear ─────────────────────────────── */

/**
 * O campo de renomear, no lugar do nome. Quem abre é o botão "Renomear" da
 * linha, então o estado de edição mora no pai e chega por `onDone`.
 *
 * Enter salva, Esc cancela, sair do campo salva — as três do handoff. Enter é
 * interceptado em vez de deixar o envio nativo acontecer: sem isso, teclar
 * Enter num nome que não mudou gravaria o mesmo título de novo. O campo não
 * fica `disabled` enquanto grava: `disabled` tira o foco do próprio campo, e o
 * blur que isso dispara enviaria o formulário uma segunda vez (Fatia 18).
 */
export function RenameForm({
  action,
  id,
  current,
  label,
  onDone,
}: {
  action: Action;
  id: string;
  current: string;
  /** "do módulo", "da aula", "do curso" — entra no nome acessível. */
  label: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [visto, setVisto] = useState(state);
  const [enviando, setEnviando] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // Ajuste em render: cada submissão devolve um estado novo. O que deu certo
  // fecha a edição; o que falhou libera o campo para uma segunda tentativa.
  if (visto !== state) {
    setVisto(state);
    setEnviando(false);
    if (state.ok) onDone();
  }

  function salvar(valor: string) {
    if (enviando) return;

    if (valor.trim() === "" || valor === current) {
      onDone();
      return;
    }

    setEnviando(true);
    form.current?.requestSubmit();
  }

  return (
    <form
      ref={form}
      action={formAction}
      className="min-w-0 flex-1 basis-60 space-y-1.5"
    >
      <Hidden values={{ id }} />
      <input
        name="title"
        defaultValue={current}
        aria-label={`Novo nome ${label}`}
        autoComplete="off"
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }

          if (event.key === "Enter") {
            event.preventDefault();
            salvar(event.currentTarget.value);
          }
        }}
        onBlur={(event) => salvar(event.currentTarget.value)}
        className={campoEmEdicao}
      />
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
    <form action={formAction} className="flex items-center gap-1">
      <Hidden values={{ id }} />
      <button
        type="submit"
        name="direction"
        value="up"
        disabled={pending || !canUp}
        aria-label={`Mover ${label} para cima`}
        className={acao}
      >
        <span aria-hidden="true">↑</span>
      </button>
      <button
        type="submit"
        name="direction"
        value="down"
        disabled={pending || !canDown}
        aria-label={`Mover ${label} para baixo`}
        className={acao}
      >
        <span aria-hidden="true">↓</span>
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
        aria-label={archived ? `Restaurar ${label}` : `Arquivar ${label}`}
        className={acao}
      >
        {archived ? "Restaurar" : "Arquivar"}
      </button>
      <Erro state={state} />
    </form>
  );
}

/* ───────────────────────────── aula estudada ─────────────────────────── */

/**
 * A caixa de seleção da linha da aula: marcar ali é a maneira rápida de
 * fechar um módulo inteiro, sem abrir aula por aula. Envia no `change`, que é
 * o que o teclado dispara ao teclar espaço.
 */
export function StudiedCheckbox({
  action,
  id,
  studied,
  title,
}: {
  action: Action;
  id: string;
  studied: boolean;
  title: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={formAction} className="flex items-center">
      <Hidden values={{ id, studied: studied ? "false" : "true" }} />
      <input
        type="checkbox"
        checked={studied}
        aria-label={`Aula estudada: ${title}`}
        onChange={() => form.current?.requestSubmit()}
        className="size-4.5 shrink-0 accent-accent"
      />
      {state.ok ? null : (
        <p role="alert" className="ml-2 text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}

/**
 * Marca a aula como estudada, ou desfaz — o botão do cabeçalho da aula. Diz
 * os dois lados por extenso ("Marcar"/"Desmarcar como estudada") e carrega o
 * estado em `aria-pressed`: sem ele, quem ouve a tela recebe dois rótulos
 * diferentes sem saber qual deles é o estado atual.
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
        aria-pressed={studied}
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        {studied ? "Desmarcar como estudada" : "Marcar como estudada"}
      </button>
      <Erro state={state} />
    </form>
  );
}
