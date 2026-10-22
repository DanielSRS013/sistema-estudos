import Link from "next/link";
import { Suspense } from "react";

import { createCourse, setCourseArchived } from "@/features/courses/actions";
import { ArchiveButton, CreateDisclosure } from "@/features/courses/components/forms";
import { CourseRail } from "@/features/courses/components/course-rail";
import {
  courseMetaLabel,
  trackCountLabel,
} from "@/features/courses/labels";
import { listCourses } from "@/features/courses/queries";
import { groupByTrack } from "@/features/courses/track";
import { Carregando, Shell } from "@/shared/shell";

export const metadata = { title: "Cursos" };

async function CourseList() {
  const courses = await listCourses();

  if (courses.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Nenhum curso ainda. Comece por <strong>Novo curso</strong>, no alto da
        página — depois vêm os módulos e as aulas.
      </p>
    );
  }

  const ativos = courses.filter((course) => course.archivedAt === null);
  const arquivados = courses.filter((course) => course.archivedAt !== null);
  const grupos = groupByTrack(ativos);

  return (
    <div className="grid gap-10">
      {grupos.map((grupo) => (
        <section key={grupo.track ?? ""}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-2">
            <h2 className="text-lg font-medium">
              {grupo.track ?? "Sem especialização"}
            </h2>
            <span className="text-xs text-ink-soft">
              {trackCountLabel(grupo.track, grupo.courses.length)}
            </span>
          </div>
          <ul>
            {grupo.courses.map((course) => (
              <li
                key={course.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-3.5"
              >
                <Link
                  href={`/courses/${course.slug}`}
                  className="min-w-0 truncate rounded-sm text-base font-medium hover:text-accent"
                >
                  {course.title}
                </Link>
                <span className="text-xs text-ink-soft">
                  {courseMetaLabel(course)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Arquivar um curso o tira do rail e dos grupos acima. Sem esta seção
          ele não teria por onde voltar — a tela dele continua de pé, mas sem
          link nenhum apontando para lá. */}
      {arquivados.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-ink-soft">
            Arquivados ({arquivados.length})
          </h2>
          <ul>
            {arquivados.map((course) => (
              <li
                key={course.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule py-1.5 text-sm text-ink-soft"
              >
                <Link
                  href={`/courses/${course.slug}`}
                  className="min-w-0 truncate rounded-sm hover:text-accent"
                >
                  {course.title}
                </Link>
                <ArchiveButton
                  action={setCourseArchived}
                  id={course.id}
                  archived
                  tipo="curso"
                  nome={course.title}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Shell rail={<CourseRail />}>
      <div className="grid w-full max-w-220 gap-10">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h1 className="text-xl font-medium tracking-tight">Cursos</h1>
          <CreateDisclosure
            buttonLabel="Novo curso"
            action={createCourse}
            placeholder="Nome do curso"
            submitLabel="Criar curso"
            withCourseMeta
          />
        </header>

        <Suspense fallback={<Carregando>Carregando os cursos.</Carregando>}>
          <CourseList />
        </Suspense>
      </div>
    </Shell>
  );
}
