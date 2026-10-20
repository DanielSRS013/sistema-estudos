// A ponte entre `extractTags` e o banco. O plano é calculado antes do batch,
// como em `cards/sync.ts`, e o chamador grava tudo numa transação só.
//
// Diferença essencial em relação a card: tag não tem histórico. O conjunto de
// tags da nota é substituído a cada gravação — tirar `#norma` do texto desfaz
// o vínculo, e nada se perde com isso. A linha em `tags` fica, mesmo sem
// nota apontando para ela: o nome do conceito é barato e a URL continua
// válida.

import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import { noteTags, tags } from "@/db/schema";

import { extractTags } from "./extract";

export type TagsPlan = {
  /** Conceitos ainda sem linha em `tags`, com o id já sorteado. */
  criar: { id: string; slug: string; name: string }[];
  /** Vínculos a criar, por id de tag. */
  vincular: string[];
  /** Vínculos a desfazer, por id de tag. */
  desvincular: string[];
  /** Slugs que a nota passa a citar — a revalidação precisa deles. */
  slugs: string[];
};

/**
 * Lê as tags que já existem e os vínculos atuais da nota, e devolve o plano.
 * Num app de um usuário só não há duas gravações simultâneas da mesma nota;
 * se houvesse, o batch falharia inteiro em vez de gravar pela metade, e o
 * editor mostraria o erro.
 */
export async function planTags(
  noteId: string,
  content: string,
): Promise<TagsPlan> {
  const extraidas = extractTags(content);
  const slugs = extraidas.map((tag) => tag.slug);

  const [existentes, atuais] = await Promise.all([
    slugs.length === 0
      ? Promise.resolve([])
      : db.query.tags.findMany({
          where: (tag, { inArray: em }) => em(tag.slug, slugs),
          columns: { id: true, slug: true },
        }),
    db.query.noteTags.findMany({
      where: (vinculo, { eq: igual }) => igual(vinculo.noteId, noteId),
      columns: { tagId: true },
    }),
  ]);

  const idPorSlug = new Map(existentes.map((tag) => [tag.slug, tag.id]));

  const criar = extraidas
    .filter((tag) => !idPorSlug.has(tag.slug))
    .map((tag) => ({ id: crypto.randomUUID(), slug: tag.slug, name: tag.name }));

  for (const tag of criar) idPorSlug.set(tag.slug, tag.id);

  const desejados = new Set(slugs.map((slug) => idPorSlug.get(slug) ?? ""));
  const vigentes = new Set(atuais.map((vinculo) => vinculo.tagId));

  return {
    criar,
    vincular: [...desejados].filter((id) => id !== "" && !vigentes.has(id)),
    desvincular: [...vigentes].filter((id) => !desejados.has(id)),
    slugs,
  };
}

/**
 * Statements do plano, na ordem: cria a tag, desfaz o vínculo que saiu, cria
 * o que entrou. A tag vem antes do vínculo porque `note_tags` referencia
 * `tags`.
 */
export function tagWrites(noteId: string, plan: TagsPlan): BatchItem<"pg">[] {
  const writes: BatchItem<"pg">[] = [];

  if (plan.criar.length > 0) {
    writes.push(db.insert(tags).values(plan.criar).onConflictDoNothing());
  }

  if (plan.desvincular.length > 0) {
    writes.push(
      db
        .delete(noteTags)
        .where(
          and(
            eq(noteTags.noteId, noteId),
            inArray(noteTags.tagId, plan.desvincular),
          ),
        ),
    );
  }

  if (plan.vincular.length > 0) {
    writes.push(
      db
        .insert(noteTags)
        .values(plan.vincular.map((tagId) => ({ noteId, tagId })))
        .onConflictDoNothing(),
    );
  }

  return writes;
}
