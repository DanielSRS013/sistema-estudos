import Link from "next/link";
import { Suspense } from "react";

import {
  createCourse,
  moveCourse,
  renameCourse,
  setCourseArchived,
} from "@/features/courses/actions";
import { CourseRail } from "@/features/courses/components/course-rail";
import {
  ArchiveButton,
  CreateForm,
  MoveButtons,
  RenameForm,
} from "@/features/courses/components/forms";
import { listCourses } from "@/features/courses/queries";
import { Carregando, Shell } from "@/shared/shell";

export const metadata = { title: "Cursos" };

async function CourseList() {
  const courses = await listCourses();

  if (courses.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Nenhum curso ainda. Comece pelo campo acima — depois vêm os módulos e as
        aulas.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {courses.map((course, index) => {
        const arquivado = course.archivedAt !== null;

        return (
          <li
            key={course.id}
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 ${
              arquivado ? "opacity-60" : ""
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <RenameForm
                action={renameCourse}
                id={course.id}
                current={course.title}
              >
                <Link
                  href={`/courses/${course.slug}`}
                  className="truncate rounded-sm text-base hover:text-accent focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none"
                >
                  {course.title}
                </Link>
              </RenameForm>
              {arquivado ? (
                <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-soft">
                  arquivado
                </span>
              ) : null}
            </div>

            <p className="w-full font-mono text-xs text-ink-soft sm:w-auto">
              {course.track ? `${course.track} · ` : ""}
              {course.moduleCount} módulos · {course.lessonCount} aulas
            </p>

            <div className="flex items-center gap-1">
              <MoveButtons
                action={moveCourse}
                id={course.id}
                canUp={index > 0}
                canDown={index < courses.length - 1}
                label="curso"
              />
              <ArchiveButton
                action={setCourseArchived}
                id={course.id}
                archived={arquivado}
                label="curso"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function CoursesPage() {
  return (
    <Shell rail={<CourseRail />}>
      <div className="measure space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs tracking-wide text-ink-soft">
            fatia 1 — casca navegável
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
          <p className="text-sm text-ink-soft">
            Um curso por linha, na ordem em que você estuda. Arquivar some da
            navegação sem apagar nada.
          </p>
        </header>

        <CreateForm
          action={createCourse}
          placeholder="Nome do curso"
          submitLabel="Criar curso"
          withTrack
        />

        <Suspense fallback={<Carregando>Carregando os cursos.</Carregando>}>
          <CourseList />
        </Suspense>
      </div>
    </Shell>
  );
}
