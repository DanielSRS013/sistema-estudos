import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  createLesson,
  createModule,
  moveLesson,
  moveModule,
  renameCourse,
  renameLesson,
  renameModule,
  setCourseArchived,
  setLessonArchived,
  setModuleArchived,
} from "@/features/courses/actions";
import { CourseRail } from "@/features/courses/components/course-rail";
import {
  ArchiveButton,
  CreateForm,
  MoveButtons,
  RenameForm,
} from "@/features/courses/components/forms";
import { getCourseBySlug } from "@/features/courses/queries";
import { Carregando, Shell } from "@/shared/shell";

async function CourseDetail({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const course = await getCourseBySlug(courseSlug);

  if (!course) notFound();

  const cursoArquivado = course.archivedAt !== null;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <nav className="font-mono text-xs text-ink-soft">
          <Link href="/courses" className="hover:text-ink">
            cursos
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <RenameForm
            action={renameCourse}
            id={course.id}
            current={course.title}
          >
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {course.title}
            </h1>
          </RenameForm>
          <ArchiveButton
            action={setCourseArchived}
            id={course.id}
            archived={cursoArquivado}
            label="curso"
          />
          {cursoArquivado ? (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-soft">
              arquivado
            </span>
          ) : null}
        </div>

        {/* Especialização e instituição — SPEC §2. Moram no cabeçalho porque
            é onde a pergunta "de onde vem este curso?" aparece. */}
        {course.track === null && course.provider === null ? null : (
          <p className="font-mono text-xs text-ink-soft">
            {[course.track, course.provider].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink-soft">Novo módulo</h2>
        <CreateForm
          action={createModule}
          hidden={{ courseId: course.id }}
          placeholder="Nome do módulo"
          submitLabel="Criar módulo"
        />
      </section>

      {course.modules.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhum módulo ainda. Crie o primeiro no campo acima.
        </p>
      ) : (
        <ul className="space-y-6">
          {course.modules.map((modulo, indiceModulo) => {
            const moduloArquivado = modulo.archivedAt !== null;

            return (
              <li
                key={modulo.id}
                className={`space-y-3 border-t border-rule pt-4 ${
                  moduloArquivado ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-soft">
                    {String(indiceModulo + 1).padStart(2, "0")}
                  </span>
                  <RenameForm
                    action={renameModule}
                    id={modulo.id}
                    current={modulo.title}
                  >
                    <h2 className="truncate text-lg font-medium">
                      {modulo.title}
                    </h2>
                  </RenameForm>
                  {moduloArquivado ? (
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-soft">
                      arquivado
                    </span>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <MoveButtons
                      action={moveModule}
                      id={modulo.id}
                      canUp={indiceModulo > 0}
                      canDown={indiceModulo < course.modules.length - 1}
                      label="módulo"
                    />
                    <ArchiveButton
                      action={setModuleArchived}
                      id={modulo.id}
                      archived={moduloArquivado}
                      label="módulo"
                    />
                  </div>
                </div>

                {modulo.lessons.length > 0 ? (
                  <ul className="divide-y divide-rule border-y border-rule">
                    {modulo.lessons.map((aula, indiceAula) => {
                      const aulaArquivada = aula.archivedAt !== null;

                      return (
                        <li
                          key={aula.id}
                          className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${
                            aulaArquivada ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <RenameForm
                              action={renameLesson}
                              id={aula.id}
                              current={aula.title}
                            >
                              <Link
                                href={`/lessons/${aula.id}`}
                                className="truncate rounded-sm text-sm hover:text-accent focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none"
                              >
                                {aula.title}
                              </Link>
                            </RenameForm>
                            {aulaArquivada ? (
                              <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-soft">
                                arquivada
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <MoveButtons
                              action={moveLesson}
                              id={aula.id}
                              canUp={indiceAula > 0}
                              canDown={indiceAula < modulo.lessons.length - 1}
                              label="aula"
                            />
                            <ArchiveButton
                              action={setLessonArchived}
                              id={aula.id}
                              archived={aulaArquivada}
                              label="aula"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <CreateForm
                  action={createLesson}
                  hidden={{ moduleId: modulo.id }}
                  placeholder="Nome da aula"
                  submitLabel="Criar aula"
                />
              </li>
            );
          })}
        </ul>
      )}
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
      <div className="measure">
        <Suspense fallback={<Carregando>Carregando o curso.</Carregando>}>
          <CourseDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
