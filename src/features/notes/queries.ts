import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/db";
import { cards, courses, lessons, modules, notes } from "@/db/schema";

import { noteLineMeta } from "./edited";
import type { NoteKind } from "./kind";
import { lastEditLabel } from "./recent";

/* ───────────────────────── notas de uma aula ─────────────────────────── */

export type NoteRow = {
  id: string;
  title: string;
  kind: NoteKind;
  /** "4 cards · editada há 2 h" — a terceira linha da nota na lista. */
  meta: string;
};

/**
 * Notas da aula, na ordem em que foram criadas. Traz o que a linha da aula
 * escreve — tipo, última edição e contagem de cards —, numa consulta só: uma
 * contagem por nota em ida separada daria N+1 numa tela de lista.
 *
 * O `leftJoin` é o que mantém na lista a nota que ainda não gerou card, e o
 * `filter` é o que tira o arquivado da conta sem tirar a nota.
 */
export async function listNotesForLesson(
  lessonId: string,
): Promise<NoteRow[]> {
  // O rótulo de edição compara com o agora da requisição: `connection()`
  // marca a leitura como dinâmica, pelo mesmo motivo de `listRecentNotes`.
  await connection();

  const now = new Date();

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      kind: notes.kind,
      updatedAt: notes.updatedAt,
      cardCount: sql<number>`count(${cards.id}) filter (where ${cards.archivedAt} is null)`.mapWith(
        Number,
      ),
    })
    .from(notes)
    .leftJoin(cards, eq(cards.noteId, notes.id))
    .where(eq(notes.lessonId, lessonId))
    .groupBy(notes.id)
    .orderBy(asc(notes.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    meta: noteLineMeta(row.cardCount, row.updatedAt, now),
  }));
}

/* ───────────────────────── últimas notas editadas ────────────────────── */

export type RecentNote = {
  id: string;
  title: string;
  /** "Curso · Aula" — o módulo fica de fora, a linha do painel é estreita. */
  path: string;
  /** Última edição já escrita para a tela: "hoje 18:42", "14/10". */
  lastEdit: string;
};

/**
 * As notas editadas mais recentemente, para o painel — SPEC §5. Ordena por
 * `notes.updatedAt`, que o autosave grava a cada gravação.
 *
 * `connection()` marca a leitura como de tempo de requisição: o rótulo de
 * última edição compara com o agora, e com `cacheComponents` ligado um
 * `new Date()` solto durante o prerender abortaria o build.
 */
export async function listRecentNotes(limite: number): Promise<RecentNote[]> {
  await connection();

  const now = new Date();

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
      courseTitle: courses.title,
      lessonTitle: lessons.title,
    })
    .from(notes)
    .innerJoin(lessons, eq(lessons.id, notes.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .orderBy(desc(notes.updatedAt))
    .limit(limite);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    path: `${row.courseTitle} · ${row.lessonTitle}`,
    lastEdit: lastEditLabel(row.updatedAt, now),
  }));
}

/* ───────────────────────── aula da próxima nota ──────────────────────── */

export type CaptureLesson = { id: string; title: string };

/**
 * Onde a próxima nota nasce: a aula da nota editada mais recentemente — é a
 * "última aula aberta" do handoff, e o app não guarda histórico de navegação.
 * Sem nota nenhuma, a primeira aula ativa na ordem da árvore; sem aula, `null`,
 * e o painel convida a criar o primeiro curso.
 */
export async function lastCaptureLesson(): Promise<CaptureLesson | null> {
  const ativa = and(
    isNull(lessons.archivedAt),
    isNull(modules.archivedAt),
    isNull(courses.archivedAt),
  );

  const [daUltimaNota] = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(notes)
    .innerJoin(lessons, eq(lessons.id, notes.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(ativa)
    .orderBy(desc(notes.updatedAt))
    .limit(1);

  if (daUltimaNota !== undefined) return daUltimaNota;

  const [primeira] = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(ativa)
    .orderBy(
      courses.position,
      courses.createdAt,
      modules.position,
      modules.createdAt,
      lessons.position,
      lessons.createdAt,
    )
    .limit(1);

  return primeira ?? null;
}

/* ──────────────────────────── /notes/[noteId] ────────────────────────── */

export type NoteDetail = NonNullable<Awaited<ReturnType<typeof getNoteById>>>;

/** A nota com o caminho até o curso — o cabeçalho mostra a trilha inteira. */
export async function getNoteById(id: string) {
  const note = await db.query.notes.findFirst({
    where: (n, { eq }) => eq(n.id, id),
    columns: {
      id: true,
      title: true,
      kind: true,
      content: true,
      lessonId: true,
      updatedAt: true,
    },
    with: {
      lesson: {
        columns: { id: true, title: true },
        with: {
          module: {
            columns: { id: true, title: true },
            with: { course: { columns: { slug: true, title: true } } },
          },
        },
      },
    },
  });

  return note ?? null;
}

/* ───────────────────────── destinos para mover ───────────────────────── */

export type LessonOption = {
  id: string;
  /** "Curso · Módulo · Aula", já pronto para o <option>. */
  path: string;
};

/**
 * Aulas ativas como destino de "mover nota". Uma consulta só: a lista é curta
 * (um usuário, três cursos) e precisa do caminho inteiro para desambiguar
 * aulas de mesmo nome em módulos diferentes.
 */
export async function listLessonOptions(): Promise<LessonOption[]> {
  const courses = await db.query.courses.findMany({
    where: (course, { isNull }) => isNull(course.archivedAt),
    orderBy: (course, { asc }) => [asc(course.position), asc(course.createdAt)],
    columns: { title: true },
    with: {
      modules: {
        where: (module_, { isNull }) => isNull(module_.archivedAt),
        orderBy: (module_, { asc }) => [
          asc(module_.position),
          asc(module_.createdAt),
        ],
        columns: { title: true },
        with: {
          lessons: {
            where: (lesson, { isNull }) => isNull(lesson.archivedAt),
            orderBy: (lesson, { asc }) => [
              asc(lesson.position),
              asc(lesson.createdAt),
            ],
            columns: { id: true, title: true },
          },
        },
      },
    },
  });

  return courses.flatMap((course) =>
    course.modules.flatMap((module_) =>
      module_.lessons.map((lesson) => ({
        id: lesson.id,
        path: `${course.title} · ${module_.title} · ${lesson.title}`,
      })),
    ),
  );
}
