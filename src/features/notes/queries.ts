import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/db";
import { courses, lessons, modules, notes } from "@/db/schema";

import { lastEditLabel } from "./recent";

/* ───────────────────────── notas de uma aula ─────────────────────────── */

export type NoteRow = { id: string; title: string };

/** Notas da aula, na ordem em que foram criadas. */
export async function listNotesForLesson(
  lessonId: string,
): Promise<NoteRow[]> {
  return db.query.notes.findMany({
    where: (note, { eq }) => eq(note.lessonId, lessonId),
    orderBy: (note, { asc }) => [asc(note.createdAt)],
    columns: { id: true, title: true },
  });
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

/* ──────────────────────────── /notes/[noteId] ────────────────────────── */

export type NoteDetail = NonNullable<Awaited<ReturnType<typeof getNoteById>>>;

/** A nota com o caminho até o curso — o cabeçalho mostra a trilha inteira. */
export async function getNoteById(id: string) {
  const note = await db.query.notes.findFirst({
    where: (n, { eq }) => eq(n.id, id),
    columns: {
      id: true,
      title: true,
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
