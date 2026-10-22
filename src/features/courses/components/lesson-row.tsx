"use client";

import Link from "next/link";
import { useState } from "react";

import {
  acao,
  ArchiveButton,
  MoveButtons,
  RenameForm,
  StudiedCheckbox,
  type Action,
} from "./forms";

/**
 * Uma aula dentro do módulo aberto: a caixa de estudada, o nome, quantas
 * notas tem e as ações. A caixa vem primeiro porque é o que se usa todo dia;
 * as ações arrumam a árvore, e isso se faz de vez em quando.
 */
export function LessonRow({
  id,
  title,
  studied,
  notesLabel,
  canUp,
  canDown,
  renameAction,
  moveAction,
  archiveAction,
  studiedAction,
}: {
  id: string;
  title: string;
  studied: boolean;
  notesLabel: string;
  canUp: boolean;
  canDown: boolean;
  renameAction: Action;
  moveAction: Action;
  archiveAction: Action;
  studiedAction: Action;
}) {
  const [renomeando, setRenomeando] = useState(false);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-1.5">
      <StudiedCheckbox
        action={studiedAction}
        id={id}
        studied={studied}
        title={title}
      />

      {renomeando ? (
        <RenameForm
          action={renameAction}
          id={id}
          current={title}
          label="da aula"
          onDone={() => setRenomeando(false)}
        />
      ) : (
        <Link
          href={`/lessons/${id}`}
          className="min-w-0 flex-1 basis-50 truncate rounded-sm py-1.5 text-sm hover:text-accent"
        >
          {title}
        </Link>
      )}

      <span className="text-xs text-ink-soft">{notesLabel}</span>

      <div
        role="group"
        aria-label={`Ações da aula ${title}`}
        className="flex flex-wrap items-center gap-1"
      >
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
          label="aula"
        />
        <ArchiveButton
          action={archiveAction}
          id={id}
          archived={false}
          label="aula"
        />
      </div>
    </li>
  );
}
