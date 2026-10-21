import { db } from "@/db";

/* ──────────────────────────────── rail ───────────────────────────────── */

export type RailNote = { id: string };
export type RailLesson = { id: string; title: string; notes: RailNote[] };
export type RailModule = { id: string; title: string; lessons: RailLesson[] };
export type RailCourse = {
  id: string;
  slug: string;
  title: string;
  modules: RailModule[];
};

/** Árvore do rail: só o que está ativo, na ordem em que o usuário arrumou. */
export async function fetchRail(): Promise<RailCourse[]> {
  const rows = await db.query.courses.findMany({
    where: (course, { isNull }) => isNull(course.archivedAt),
    orderBy: (course, { asc }) => [asc(course.position), asc(course.createdAt)],
    columns: { id: true, slug: true, title: true },
    with: {
      modules: {
        where: (module_, { isNull }) => isNull(module_.archivedAt),
        orderBy: (module_, { asc }) => [
          asc(module_.position),
          asc(module_.createdAt),
        ],
        columns: { id: true, title: true },
        with: {
          lessons: {
            where: (lesson, { isNull }) => isNull(lesson.archivedAt),
            orderBy: (lesson, { asc }) => [
              asc(lesson.position),
              asc(lesson.createdAt),
            ],
            columns: { id: true, title: true },
            // O id das notas resolve `/notes/<id>` no rail: a casca monta a
            // árvore antes de a página saber de que curso a nota é.
            with: { notes: { columns: { id: true } } },
          },
        },
      },
    },
  });

  return rows;
}

/* ─────────────────────────────── /courses ────────────────────────────── */

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  track: string | null;
  position: number;
  archivedAt: Date | null;
  moduleCount: number;
  lessonCount: number;
};

/** Lista completa, arquivados inclusive — a página os separa. */
export async function listCourses(): Promise<CourseRow[]> {
  const rows = await db.query.courses.findMany({
    orderBy: (course, { asc }) => [asc(course.position), asc(course.createdAt)],
    with: {
      modules: {
        where: (module_, { isNull }) => isNull(module_.archivedAt),
        columns: { id: true },
        with: {
          lessons: {
            where: (lesson, { isNull }) => isNull(lesson.archivedAt),
            columns: { id: true },
          },
        },
      },
    },
  });

  return rows.map(({ modules, ...course }) => ({
    ...course,
    moduleCount: modules.length,
    lessonCount: modules.reduce((total, m) => total + m.lessons.length, 0),
  }));
}

/* ─────────────────────── /courses/[courseSlug] ───────────────────────── */

export type CourseDetail = NonNullable<
  Awaited<ReturnType<typeof getCourseBySlug>>
>;

export async function getCourseBySlug(slug: string) {
  const course = await db.query.courses.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
    with: {
      modules: {
        orderBy: (module_, { asc }) => [
          asc(module_.position),
          asc(module_.createdAt),
        ],
        with: {
          lessons: {
            orderBy: (lesson, { asc }) => [
              asc(lesson.position),
              asc(lesson.createdAt),
            ],
          },
        },
      },
    },
  });

  return course ?? null;
}

/* ───────────────────────── /lessons/[lessonId] ───────────────────────── */

export type LessonDetail = NonNullable<
  Awaited<ReturnType<typeof getLessonById>>
>;

export async function getLessonById(id: string) {
  const lesson = await db.query.lessons.findFirst({
    where: (l, { eq }) => eq(l.id, id),
    with: {
      module: {
        with: {
          course: true,
          lessons: {
            orderBy: (sibling, { asc }) => [
              asc(sibling.position),
              asc(sibling.createdAt),
            ],
            columns: { id: true, title: true, position: true },
          },
        },
      },
    },
  });

  return lesson ?? null;
}
