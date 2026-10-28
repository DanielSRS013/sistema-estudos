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

import { cardStateLabel, type CardState } from "@/features/cards/labels";
import type { CardKind } from "@/features/cards/parser";
import type { NoteKind } from "@/features/notes/kind";

import { ABRE, splitHighlight, type Segmento } from "./highlight";

/**
 * O trecho a exibir, entre o destaque sobre o texto como está e o destaque
 * sobre o mesmo texto sem acento.
 *
 * O recuo existe para um caso só: termo digitado sem acento contra texto
 * acentuado ("trigonometrico" contra "trigonométrico"), onde o `ts_headline`
 * não casa nada e devolve o começo do texto, sem marca. Ele **só** vale quando
 * a versão sem acento ganha o que a outra não ganhou — "não marcou" sozinho é o
 * caso comum (o termo está na outra coluna, e o vetor cobre as duas), e recuar
 * ali trocaria um texto certo por um texto sem diacrítico à toa.
 */
export function escolherDestaque(comoEsta: string, semAcento: string): string {
  return !comoEsta.includes(ABRE) && semAcento.includes(ABRE)
    ? semAcento
    : comoEsta;
}

/** Uma linha da consulta de notas, com o título e o trecho já destacados. */
export type NoteRow = {
  id: string;
  title: string;
  /** O mesmo título destacado sobre o texto sem acento — ver `escolherDestaque`. */
  titleSemAcento: string;
  /** O título sem as marcas do destaque — ver `plainTitle` na consulta. */
  plainTitle: string;
  snippet: string;
  snippetSemAcento: string;
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
  promptSemAcento: string;
  answer: string;
  answerSemAcento: string;
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

/** O que nota e card trazem igual. A diferença entre os dois está em `SearchHit`. */
type HitComum = {
  /** Chave de lista. `card:` na frente porque nota e card podem ter o mesmo id. */
  key: string;
  /** Para onde o resultado leva: a nota, ou a nota de origem do card. */
  noteId: string;
  /**
   * "Nota" ou "Card": o primeiro token do meta, como o handoff escreve ("Nota ·
   * curso · aula", "Card · estado · de <nota>"). Numa lista misturada é o que
   * diz de onde o resultado veio — o tipo de domínio ("Resumo", "Lacuna") não
   * diz isso a quem está varrendo a lista.
   */
  tipo: string;
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

/**
 * Um resultado da busca, nota ou card.
 *
 * União discriminada por `origem`, e não um registro só com campo opcional: a
 * invariante é que nota não tem estado e card sempre tem. Com `estado:
 * string | null` o tipo não dizia isso, e a tela interpolava o campo confiando
 * na invariante por fora — um dia alguém monta o meta da nota com `estado`
 * dentro e imprime "Nota · null · …" sem o compilador reclamar. Aqui a chave
 * só existe no lado do card, então ler `hit.estado` obriga a estreitar por
 * `origem` antes.
 */
export type SearchHit =
  | (HitComum & { origem: "note" })
  | (HitComum & {
      origem: "card";
      /** Estado do card em português — "aprendendo", "suspenso". */
      estado: string;
    });

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
    tipo: "Nota",
    title: splitHighlight(escolherDestaque(row.title, row.titleSemAcento)),
    snippet: splitHighlight(escolherDestaque(row.snippet, row.snippetSemAcento)),
    path: caminho(row),
    noteTitle: row.plainTitle,
    updatedAt: row.updatedAt,
    rank: row.rank,
  };
}

function doCard(row: CardRow): SearchHit {
  return {
    key: `card:${row.id}`,
    noteId: row.noteId,
    origem: "card",
    tipo: "Card",
    estado: cardStateLabel({ state: row.state, suspended: row.suspended }),
    title: splitHighlight(escolherDestaque(row.prompt, row.promptSemAcento)),
    snippet: splitHighlight(escolherDestaque(row.answer, row.answerSemAcento)),
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
