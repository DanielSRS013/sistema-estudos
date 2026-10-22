import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  createLesson,
  createModule,
  moveCourse,
  moveLesson,
  moveModule,
  renameLesson,
  renameModule,
  setCourseArchived,
  setLessonArchived,
  setLessonStudied,
  setModuleArchived,
} from "@/features/courses/actions";
import { CourseRail } from "@/features/courses/components/course-rail";
import {
  ArchiveButton,
  CreateDisclosure,
  MoveButtons,
} from "@/features/courses/components/forms";
import { LessonRow } from "@/features/courses/components/lesson-row";
import { ModuleRow } from "@/features/courses/components/module-row";
import {
  courseMetaLabel,
  lessonNotesLabel,
  moduleStudiedLabel,
} from "@/features/courses/labels";
import { getCourseBySlug, listCourseIds } from "@/features/courses/queries";
import { studiedCount } from "@/features/courses/studied";
import { Carregando, Shell } from "@/shared/shell";

async function CourseDetail({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const [course, ordemDosCursos] = await Promise.all([
    getCourseBySlug(courseSlug),
    listCourseIds(),
  ]);

  if (!course) notFound();

  const posicao = ordemDosCursos.indexOf(course.id);

  const modulos = course.modules.filter(
    (modulo) => modulo.archivedAt === null,
  );
  const aulasAtivas = modulos.flatMap((modulo) =>
    modulo.lessons.filter((aula) => aula.archivedAt === null),
  );

  // Arquivado sai da lista e se junta no fim, com o rótulo do que é: a
  // alternativa — ficar na lista mais apagado — some com a hierarquia e deixa
  // a numeração dos módulos com buraco.
  const arquivados = [
    ...course.modules
      .filter((modulo) => modulo.archivedAt !== null)
      .map((modulo) => ({
        key: `m${modulo.id}`,
        id: modulo.id,
        label: `Módulo · ${modulo.title}`,
        action: setModuleArchived,
        tipo: "módulo",
      })),
    ...course.modules.flatMap((modulo) =>
      modulo.lessons
        .filter((aula) => aula.archivedAt !== null)
        .map((aula) => ({
          key: `l${aula.id}`,
          id: aula.id,
          label: `Aula · ${modulo.title} · ${aula.title}`,
          action: setLessonArchived,
          tipo: "aula",
        })),
    ),
  ];

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <nav className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-soft">
          <Link href="/courses" className="text-accent">
            Cursos
          </Link>
          {course.track === null ? null : (
            <>
              <span aria-hidden="true">·</span>
              <span>{course.track}</span>
            </>
          )}
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h1 className="min-w-0 truncate text-xl font-medium tracking-tight">
            {course.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Reordenar e arquivar o curso moram aqui: a lista de /courses
                virou só nome e meta, e a tela do curso é a que fala dele. */}
            <MoveButtons
              action={moveCourse}
              id={course.id}
              canUp={posicao > 0}
              canDown={posicao !== -1 && posicao < ordemDosCursos.length - 1}
              label="curso"
            />
            <ArchiveButton
              action={setCourseArchived}
              id={course.id}
              archived={course.archivedAt !== null}
              label="curso"
            />
            <CreateDisclosure
              buttonLabel="Novo módulo"
              action={createModule}
              hidden={{ courseId: course.id }}
              placeholder="Nome do módulo"
              submitLabel="Criar módulo"
            />
          </div>
        </div>

        <p className="text-xs text-ink-soft">
          {courseMetaLabel({
            moduleCount: modulos.length,
            lessonCount: aulasAtivas.length,
            studiedCount: studiedCount(aulasAtivas),
          })}
        </p>
      </header>

      {modulos.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhum módulo ainda. Comece por <strong>Novo módulo</strong>, no alto
          da página.
        </p>
      ) : (
        <ol className="border-t border-ink">
          {modulos.map((modulo, indiceModulo) => {
            const aulas = modulo.lessons.filter(
              (aula) => aula.archivedAt === null,
            );

            return (
              <ModuleRow
                key={modulo.id}
                id={modulo.id}
                number={indiceModulo + 1}
                title={modulo.title}
                countLabel={moduleStudiedLabel({
                  lessonCount: aulas.length,
                  studiedCount: studiedCount(aulas),
                })}
                empty={aulas.length === 0}
                canUp={indiceModulo > 0}
                canDown={indiceModulo < modulos.length - 1}
                renameAction={renameModule}
                moveAction={moveModule}
                archiveAction={setModuleArchived}
                createLessonAction={createLesson}
              >
                {aulas.map((aula, indiceAula) => (
                  <LessonRow
                    key={aula.id}
                    id={aula.id}
                    title={aula.title}
                    studied={aula.studiedOn !== null}
                    notesLabel={lessonNotesLabel(aula.notes.length)}
                    canUp={indiceAula > 0}
                    canDown={indiceAula < aulas.length - 1}
                    renameAction={renameLesson}
                    moveAction={moveLesson}
                    archiveAction={setLessonArchived}
                    studiedAction={setLessonStudied}
                  />
                ))}
              </ModuleRow>
            );
          })}
        </ol>
      )}

      {arquivados.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-ink-soft">
            Arquivados ({arquivados.length})
          </h2>
          <ul>
            {arquivados.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule py-1.5 text-sm text-ink-soft"
              >
                <span className="min-w-0 truncate">{item.label}</span>
                <ArchiveButton
                  action={item.action}
                  id={item.id}
                  archived
                  label={item.tipo}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      <div className="w-full max-w-220">
        <Suspense fallback={<Carregando>Carregando o curso.</Carregando>}>
          <CourseDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
