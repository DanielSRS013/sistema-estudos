import { asc, eq, like } from "drizzle-orm";

import { db } from "@/db";
import { noteTags, notes, tags } from "@/db/schema";
import type { NoteKind } from "@/features/notes/kind";
import { slugify } from "@/shared/slug";

export type TagNote = {
  id: string;
  title: string;
  /** "Anotação de aula", "Resumo", "Resolução" — o meta acima do título. */
  kind: NoteKind;
  updatedAt: Date;
  /** "Curso · Módulo · Aula", para situar a nota sem abrir. */
  path: string;
  courseSlug: string;
  lessonId: string;
};

export type TagCard = {
  id: string;
  kind: "cloze" | "qa";
  ordinal: number;
  prompt: string;
  answer: string;
  hint: string | null;
  state: "new" | "learning" | "review" | "relearning";
  reps: number;
  suspended: boolean;
  note: { id: string; title: string };
};

export type TagDetail = {
  slug: string;
  name: string;
  notes: TagNote[];
  cards: TagCard[];
};

/**
 * A página do conceito: as notas que o citam e os cards que elas geram.
 *
 * Card não tem tag própria — herda a da nota em tempo de consulta, como manda
 * o SPEC §2. Por isso os cards saem de uma segunda consulta pelos ids das
 * notas, e não de uma tabela `card_tags` que não existe.
 */
export async function getTagBySlug(slug: string): Promise<TagDetail | null> {
  const tag = await db.query.tags.findFirst({
    where: (t, { eq: igual }) => igual(t.slug, slug),
    columns: { id: true, slug: true, name: true },
  });

  if (!tag) return null;

  const vinculadas = await db
    .select({
      id: notes.id,
      title: notes.title,
      kind: notes.kind,
      updatedAt: notes.updatedAt,
      lessonId: notes.lessonId,
    })
    .from(noteTags)
    .innerJoin(notes, eq(noteTags.noteId, notes.id))
    .where(eq(noteTags.tagId, tag.id));

  if (vinculadas.length === 0) {
    return { slug: tag.slug, name: tag.name, notes: [], cards: [] };
  }

  const ids = vinculadas.map((nota) => nota.id);

  const [trilhas, cardsDasNotas] = await Promise.all([
    db.query.notes.findMany({
      where: (nota, { inArray: em }) => em(nota.id, ids),
      columns: { id: true },
      with: {
        lesson: {
          columns: { id: true, title: true },
          with: {
            module: {
              columns: { title: true },
              with: { course: { columns: { slug: true, title: true } } },
            },
          },
        },
      },
    }),
    db.query.cards.findMany({
      where: (card, { inArray: em, isNull: nulo, and: e }) =>
        e(em(card.noteId, ids), nulo(card.archivedAt)),
      orderBy: (card, { asc }) => [asc(card.noteId), asc(card.ordinal)],
      columns: {
        id: true,
        kind: true,
        ordinal: true,
        prompt: true,
        answer: true,
        hint: true,
        state: true,
        reps: true,
        suspended: true,
      },
      with: { note: { columns: { id: true, title: true } } },
    }),
  ]);

  const trilhaPorNota = new Map(
    trilhas.map((nota) => [
      nota.id,
      {
        path: `${nota.lesson.module.course.title} · ${nota.lesson.module.title} · ${nota.lesson.title}`,
        courseSlug: nota.lesson.module.course.slug,
      },
    ]),
  );

  return {
    slug: tag.slug,
    name: tag.name,
    notes: vinculadas
      .map((nota) => ({
        id: nota.id,
        title: nota.title,
        kind: nota.kind,
        updatedAt: nota.updatedAt,
        lessonId: nota.lessonId,
        path: trilhaPorNota.get(nota.id)?.path ?? "",
        courseSlug: trilhaPorNota.get(nota.id)?.courseSlug ?? "",
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    cards: cardsDasNotas,
  };
}

/**
 * O conceito que a busca sem resultado oferece como saída.
 *
 * O handoff escreve "ou abra o conceito #projecao-vetorial", com uma tag de
 * verdade. Montar o link com o termo digitado daria 404 na maior parte das
 * vezes — é justamente o termo que não encontrou nada —, então a oferta é uma
 * tag existente cujo slug contenha o que foi digitado: "projecao" oferece
 * `#projecao-vetorial`. Sem casamento não há oferta, e a frase termina antes.
 *
 * A tag precisa ter nota: tag sem nenhuma nota vinculada existe (o `#` saiu da
 * nota, ou a nota foi apagada) e abrir uma delas leva a uma página de duas
 * seções vazias. Quem não achou nada merece uma saída, não um segundo beco.
 *
 * `slugify` é o que torna o `like` seguro: ele só deixa passar `[a-z0-9-]`, e
 * `%` ou `_` digitados não chegam a virar curinga.
 */
export async function sugerirConceito(termo: string): Promise<string | null> {
  const alvo = slugify(termo);

  if (alvo === "") return null;

  const [achado] = await db
    .select({ slug: tags.slug })
    .from(tags)
    .innerJoin(noteTags, eq(noteTags.tagId, tags.id))
    .where(like(tags.slug, `%${alvo}%`))
    .orderBy(asc(tags.slug))
    .limit(1);

  return achado?.slug ?? null;
}
