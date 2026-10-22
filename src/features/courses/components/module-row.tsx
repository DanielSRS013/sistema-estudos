"use client";

import { useState } from "react";

import {
  acao,
  ArchiveButton,
  CreateForm,
  MoveButtons,
  RenameForm,
  type Action,
} from "./forms";

/**
 * Um módulo da tela do curso: a linha que abre e fecha, as ações do módulo e,
 * quando aberto, as aulas.
 *
 * As aulas chegam por `children` porque quem as lê do banco é a página; aqui
 * só mora o estado da tela — aberto, renomeando, criando. O módulo nasce
 * recolhido, como no handoff: o que a linha precisa dizer de longe é quantas
 * aulas faltam, e a árvore inteira continua no rail.
 */
export function ModuleRow({
  id,
  number,
  title,
  countLabel,
  empty,
  canUp,
  canDown,
  renameAction,
  moveAction,
  archiveAction,
  createLessonAction,
  children,
}: {
  id: string;
  number: number;
  title: string;
  countLabel: string;
  empty: boolean;
  canUp: boolean;
  canDown: boolean;
  renameAction: Action;
  moveAction: Action;
  archiveAction: Action;
  createLessonAction: Action;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [criando, setCriando] = useState(false);

  function novaAula() {
    setAberto(true);
    setCriando(true);
  }

  return (
    <li className="border-b border-rule">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5">
        {renomeando ? (
          <RenameForm
            action={renameAction}
            id={id}
            current={title}
            label="do módulo"
            onDone={() => setRenomeando(false)}
          />
        ) : (
          <button
            type="button"
            aria-expanded={aberto}
            onClick={() => setAberto((valor) => !valor)}
            className="flex min-h-11 flex-1 basis-60 flex-wrap items-baseline gap-x-2.5 gap-y-1 py-1.5 text-left"
          >
            <span aria-hidden="true" className="w-3 text-xs text-ink-soft">
              {aberto ? "▾" : "▸"}
            </span>
            <span className="text-base font-medium">
              {number}. {title}
            </span>
            <span className="text-xs text-ink-soft">{countLabel}</span>
          </button>
        )}

        <div
          role="group"
          aria-label={`Ações do módulo ${title}`}
          className="flex flex-wrap items-center gap-1"
        >
          <button type="button" onClick={novaAula} className={acao}>
            Nova aula
          </button>
          <button
            type="button"
            onClick={() => setRenomeando(true)}
            className={acao}
          >
            Renomear
          </button>
          <MoveButtons
            action={moveAction}
            id={id}
            canUp={canUp}
            canDown={canDown}
            label="módulo"
          />
          <ArchiveButton
            action={archiveAction}
            id={id}
            archived={false}
            label="módulo"
          />
        </div>
      </div>

      {aberto ? (
        <ul className="grid pb-3 pl-5.5">
          {children}
          {empty ? (
            <li className="border-t border-rule py-2.5 text-sm">
              Módulo sem aulas.{" "}
              <button
                type="button"
                onClick={novaAula}
                className="text-accent underline-offset-4 hover:underline"
              >
                Criar a primeira aula
              </button>
            </li>
          ) : null}
          {criando ? (
            <li className="border-t border-rule pt-2.5">
              <CreateForm
                action={createLessonAction}
                hidden={{ moduleId: id }}
                placeholder="Nome da aula"
                submitLabel="Criar aula"
                onDone={() => setCriando(false)}
              />
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}
