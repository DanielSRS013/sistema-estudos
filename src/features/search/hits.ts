// A lista de resultados da busca, montada fora do banco. Puro: entram as duas
// consultas como o Postgres as devolve, sai a lista única que a tela percorre.
//
// Por que mesclar aqui e não com um `UNION` no SQL: a ordenação é por
// relevância, e `ts_rank_cd` já vem em cada linha. Com a mescla em TypeScript o
// comportamento que importa — um card relevante não ficar atrás de trinta notas
// irrelevantes — é testável sem banco, e o projeto não tem harness de banco.
//
// O corte no limite acontece *depois* da mescla, de propósito: cada consulta
// pede o limite inteiro, e quem sobra são os mais relevantes dos dois lados.

import { cardKindLabel, cardStateLabel, type CardState } from "@/features/cards/labels";
import type { CardKind } from "@/features/cards/parser";
import { noteKindLabel, type NoteKind } from "@/features/notes/kind";

import { splitHighlight, type Segmento } from "./highlight";

/** Uma linha da consulta de notas, com o título e o trecho já destacados. */
export type NoteRow = {
  id: string;
  title: string;
  snippet: string;
  kind: NoteKind;
  updatedAt: Date;
  rank: number;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
};

/** Uma linha da consulta de cards, com a face e a resposta já destacadas. */
export type CardRow = {
  id: string;
  noteId: string;
  prompt: string;
  answer: string;
  kind: CardKind;
  state: CardState;
  suspended: boolean;
  noteTitle: string;
  updatedAt: Date;
  rank: number;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
};

export type SearchHit = {
  /** Chave de lista. `card:` na frente porque nota e card podem ter o mesmo id. */
  key: string;
  /** Para onde o resultado leva: a nota, ou a nota de origem do card. */
  noteId: string;
  origem: "note" | "card";
  /** "Anotação de aula", "Resumo", "Lacuna", "Pergunta" — o meta do handoff. */
  tipo: string;
  /** Estado do card em português; `null` numa nota, que não tem estado. */
  estado: string | null;
  /** Nota: o título. Card: a face. */
  title: Segmento[];
  /** Nota: o trecho do corpo. Card: a resposta. */
  snippet: Segmento[];
  /** "Curso · Módulo · Aula". */
  path: string;
  /** Título da nota de origem, para o card poder linkar de volta. */
  noteTitle: string;
  updatedAt: Date;
  rank: number;
};

function caminho(row: {
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
}): string {
  return `${row.courseTitle} · ${row.moduleTitle} · ${row.lessonTitle}`;
}

function daNota(row: NoteRow): SearchHit {
  return {
    key: row.id,
    noteId: row.id,
    origem: "note",
    tipo: noteKindLabel(row.kind),
    estado: null,
    title: splitHighlight(row.title),
    snippet: splitHighlight(row.snippet),
    path: caminho(row),
    noteTitle: row.title,
    updatedAt: row.updatedAt,
    rank: row.rank,
  };
}

function doCard(row: CardRow): SearchHit {
  return {
    key: `card:${row.id}`,
    noteId: row.noteId,
    origem: "card",
    tipo: cardKindLabel(row.kind),
    estado: cardStateLabel({ state: row.state, suspended: row.suspended }),
    title: splitHighlight(row.prompt),
    snippet: splitHighlight(row.answer),
    path: caminho(row),
    noteTitle: row.noteTitle,
    updatedAt: row.updatedAt,
    rank: row.rank,
  };
}

/**
 * Notas e cards numa lista só, por relevância decrescente. Empate de
 * relevância cai na edição mais recente — é o mesmo desempate que a consulta de
 * notas já usava antes de os cards entrarem.
 */
export function mesclarHits(
  notas: readonly NoteRow[],
  cards: readonly CardRow[],
  limite: number,
): SearchHit[] {
  return [...notas.map(daNota), ...cards.map(doCard)]
    .sort(
      (a, b) =>
        b.rank - a.rank || b.updatedAt.getTime() - a.updatedAt.getTime(),
    )
    .slice(0, limite);
}
