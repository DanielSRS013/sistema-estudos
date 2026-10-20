import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import {
  moveLesson,
  renameLesson,
  setLessonArchived,
  setLessonStudied,
} from "@/features/courses/actions";
import { CourseRail } from "@/features/courses/components/course-rail";
import {
  ArchiveButton,
  MoveButtons,
  RenameForm,
  StudiedButton,
} from "@/features/courses/components/forms";
import { getLessonById } from "@/features/courses/queries";
import { studiedLabel } from "@/features/courses/studied";
import { createNote } from "@/features/notes/actions";
import { CreateNoteForm } from "@/features/notes/components/note-forms";
import { listNotesForLesson } from "@/features/notes/queries";
import { Carregando, Shell } from "@/shared/shell";

async function LessonDetail({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;

  // Id fora do formato não chega a virar consulta: o banco recusaria o texto e
  // isso apareceria como erro, não como 404.
  if (!z.uuid().safeParse(lessonId).success) notFound();

  const [lesson, notas] = await Promise.all([
    getLessonById(lessonId),
    listNotesForLesson(lessonId),
  ]);

  if (!lesson) notFound();

  const { module: modulo } = lesson;
  const irmas = modulo.lessons;
  const indice = irmas.findIndex((irma) => irma.id === lesson.id);
  const arquivada = lesson.archivedAt !== null;
  const estudada = lesson.studiedOn;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <nav className="font-mono text-xs text-ink-soft">
          <Link
            href={`/courses/${modulo.course.slug}`}
            className="hover:text-ink"
          >
            {modulo.course.title}
          </Link>
          {` · ${modulo.title}`}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <RenameForm
            action={renameLesson}
            id={lesson.id}
            current={lesson.title}
          >
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {lesson.title}
            </h1>
          </RenameForm>
          {arquivada ? (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-soft">
              arquivada
            </span>
          ) : null}
          <div className="flex items-center gap-1">
            <MoveButtons
              action={moveLesson}
              id={lesson.id}
              canUp={indice > 0}
              canDown={indice !== -1 && indice < irmas.length - 1}
              label="aula"
            />
            <ArchiveButton
              action={setLessonArchived}
              id={lesson.id}
              archived={arquivada}
              label="aula"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StudiedButton
            action={setLessonStudied}
            id={lesson.id}
            studied={estudada !== null}
          />
          <p className="font-mono text-xs text-ink-soft">
            {estudada === null
              ? "Ainda não marcada como estudada."
              : `Estudada em ${studiedLabel(estudada)}.`}
          </p>
        </div>
      </header>

      <section className="space-y-3 border-t border-rule pt-4">
        <h2 className="text-sm font-medium text-ink-soft">Notas</h2>

        {notas.length === 0 ? (
          <p className="font-serif text-base leading-[1.65] text-ink-soft">
            Esta aula ainda não tem notas. Crie a primeira abaixo.
          </p>
        ) : (
          <ul className="space-y-0.5 text-sm">
            {notas.map((nota) => (
              <li key={nota.id}>
                <Link
                  href={`/notes/${nota.id}`}
                  className="block truncate rounded-sm px-1 py-0.5 hover:bg-muted focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none"
                >
                  {nota.title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <CreateNoteForm action={createNote} lessonId={lesson.id} />
      </section>
    </div>
  );
}

export default function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      <div className="measure">
        <Suspense fallback={<Carregando>Carregando a aula.</Carregando>}>
          <LessonDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
