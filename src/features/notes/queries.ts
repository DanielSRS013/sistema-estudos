import { db } from "@/db";

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
