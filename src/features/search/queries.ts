import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { cards, courses, lessons, modules, notes } from "@/db/schema";

import { ABRE, FECHA } from "./highlight";
import { mesclarHits, type CardRow, type NoteRow, type SearchHit } from "./hits";

export type { SearchHit } from "./hits";

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

/**
 * Opções de linha curta: título da nota, face e resposta do card. A linha
 * inteira é exibida, então destaca-se ela inteira em vez de recortar fragmento.
 */
const OPCOES_TITULO = [
  `StartSel=${ABRE}`,
  `StopSel=${FECHA}`,
  "HighlightAll=true",
].join(",");

/**
 * Busca full-text em notas **e** cards pelas colunas geradas `search_vector`,
 * com a configuração `portuguese` — SPEC §5. Sem serviço externo e sem
 * varredura: os dois índices GIN respondem.
 *
 * Acento é opcional nas duas pontas. Dentro do vetor quem tira o diacrítico é
 * `immutable_unaccent` (migration 0005); aqui ele tira do que o usuário
 * digitou, e é por isso que "projecao" encontra "projeção". O stemmer
 * português sozinho não faz isso — ele corta sufixo, não acento.
 *
 * `websearch_to_tsquery` aceita o que o usuário digita de verdade, incluindo
 * aspas e `or`, e não levanta erro de sintaxe com entrada solta: termo que
 * não gera consulta simplesmente não casa com nada.
 */
export async function searchNotesAndCards(termo: string): Promise<SearchHit[]> {
  const limpo = termo.trim();

  if (limpo === "") return [];

  const consulta = sql`websearch_to_tsquery('portuguese', immutable_unaccent(${limpo}))`;

  // O `ts_headline` não lê a coluna gerada: ele reanalisa o texto cru, cujos
  // lexemas ainda têm o diacrítico. Com só a consulta sem acento ele não
  // encontra o que casar e devolve o começo do texto, sem marca — a busca acha
  // e não aponta. Daí o `||`: a consulta do destaque é a união das duas
  // escritas, e cada uma pega o seu lado (texto acentuado com termo acentuado,
  // texto sem acento com termo sem acento).
  const destaque = sql`(${consulta}) || websearch_to_tsquery('portuguese', ${limpo})`;

  const [notaRows, cardRows] = await Promise.all([
    db
      .select({
        id: notes.id,
        title: sql<string>`ts_headline('portuguese', ${notes.title}, ${destaque}, ${OPCOES_TITULO})`,
        // O título cru, além do destacado: `noteTitle` é texto para ler, e a
        // saída do `ts_headline` carrega os caracteres de controle da marca.
        plainTitle: notes.title,
        snippet: sql<string>`ts_headline('portuguese', ${notes.content}, ${destaque}, ${OPCOES})`,
        kind: notes.kind,
        updatedAt: notes.updatedAt,
        rank: sql<number>`ts_rank_cd(${notes.searchVector}, ${consulta})`,
        courseTitle: courses.title,
        moduleTitle: modules.title,
        lessonTitle: lessons.title,
      })
      .from(notes)
      .innerJoin(lessons, sql`${lessons.id} = ${notes.lessonId}`)
      .innerJoin(modules, sql`${modules.id} = ${lessons.moduleId}`)
      .innerJoin(courses, sql`${courses.id} = ${modules.courseId}`)
      .where(sql`${notes.searchVector} @@ ${consulta}`)
      // Sem isto o `limit` traz 30 linhas quaisquer: cada lado precisa pedir
      // os SEUS 30 mais relevantes, senão a mescla ordena uma amostra ao acaso.
      .orderBy(
        sql`ts_rank_cd(${notes.searchVector}, ${consulta}) desc`,
        desc(notes.updatedAt),
      )
      .limit(LIMITE),

    // Card arquivado fica fora: ele saiu de circulação. Suspenso entra, com o
    // estado dizendo "suspenso" — quem busca quer achar o que escreveu.
    db
      .select({
        id: cards.id,
        noteId: cards.noteId,
        prompt: sql<string>`ts_headline('portuguese', ${cards.prompt}, ${destaque}, ${OPCOES_TITULO})`,
        // A resposta não é linha curta — é o bloco depois do corte, com
        // parágrafos e LaTeX. Vai com o mesmo limite do corpo da nota.
        answer: sql<string>`ts_headline('portuguese', ${cards.answer}, ${destaque}, ${OPCOES})`,
        kind: cards.kind,
        state: cards.state,
        suspended: cards.suspended,
        noteTitle: notes.title,
        updatedAt: notes.updatedAt,
        rank: sql<number>`ts_rank_cd(${cards.searchVector}, ${consulta})`,
        courseTitle: courses.title,
        moduleTitle: modules.title,
        lessonTitle: lessons.title,
      })
      .from(cards)
      .innerJoin(notes, sql`${notes.id} = ${cards.noteId}`)
      .innerJoin(lessons, sql`${lessons.id} = ${notes.lessonId}`)
      .innerJoin(modules, sql`${modules.id} = ${lessons.moduleId}`)
      .innerJoin(courses, sql`${courses.id} = ${modules.courseId}`)
      .where(
        sql`${cards.searchVector} @@ ${consulta} and ${cards.archivedAt} is null`,
      )
      .orderBy(
        sql`ts_rank_cd(${cards.searchVector}, ${consulta}) desc`,
        desc(notes.updatedAt),
      )
      .limit(LIMITE),
  ]);

  return mesclarHits(
    notaRows satisfies NoteRow[],
    cardRows satisfies CardRow[],
    LIMITE,
  );
}
