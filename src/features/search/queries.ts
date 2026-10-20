import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { courses, lessons, modules, notes } from "@/db/schema";

import { ABRE, FECHA, splitHighlight, type Segmento } from "./highlight";

export type SearchHit = {
  id: string;
  /** Título com os termos recortados para destaque. */
  title: Segmento[];
  /** Trechos do corpo onde o termo aparece. */
  snippet: Segmento[];
  path: string;
  updatedAt: Date;
};

const LIMITE = 30;

/**
 * Opções do `ts_headline`. As marcas são caracteres de controle em vez de
 * tags: quem monta o `<mark>` é a UI, com elementos React. Ver `highlight.ts`.
 */
const OPCOES = [
  `StartSel=${ABRE}`,
  `StopSel=${FECHA}`,
  "MaxFragments=2",
  'FragmentDelimiter=" … "',
  "MinWords=8",
  "MaxWords=24",
].join(",");

/** Opções do título: a linha é curta, então destaca-se ela inteira. */
const OPCOES_TITULO = [
  `StartSel=${ABRE}`,
  `StopSel=${FECHA}`,
  "HighlightAll=true",
].join(",");

/**
 * Busca full-text nas notas pela coluna gerada `search_vector`, com a
 * configuração `portuguese` — SPEC §5. Sem serviço externo e sem varredura:
 * o índice GIN responde.
 *
 * `websearch_to_tsquery` aceita o que o usuário digita de verdade, incluindo
 * aspas e `or`, e não levanta erro de sintaxe com entrada solta: termo que
 * não gera consulta simplesmente não casa com nada.
 */
export async function searchNotes(termo: string): Promise<SearchHit[]> {
  const limpo = termo.trim();

  if (limpo === "") return [];

  const consulta = sql`websearch_to_tsquery('portuguese', ${limpo})`;

  const rows = await db
    .select({
      id: notes.id,
      title: sql<string>`ts_headline('portuguese', ${notes.title}, ${consulta}, ${OPCOES_TITULO})`,
      snippet: sql<string>`ts_headline('portuguese', ${notes.content}, ${consulta}, ${OPCOES})`,
      updatedAt: notes.updatedAt,
      courseTitle: courses.title,
      moduleTitle: modules.title,
      lessonTitle: lessons.title,
    })
    .from(notes)
    .innerJoin(lessons, sql`${lessons.id} = ${notes.lessonId}`)
    .innerJoin(modules, sql`${modules.id} = ${lessons.moduleId}`)
    .innerJoin(courses, sql`${courses.id} = ${modules.courseId}`)
    .where(sql`${notes.searchVector} @@ ${consulta}`)
    .orderBy(sql`ts_rank_cd(${notes.searchVector}, ${consulta}) desc`, desc(notes.updatedAt))
    .limit(LIMITE);

  return rows.map((row) => ({
    id: row.id,
    title: splitHighlight(row.title),
    snippet: splitHighlight(row.snippet),
    path: `${row.courseTitle} · ${row.moduleTitle} · ${row.lessonTitle}`,
    updatedAt: row.updatedAt,
  }));
}
