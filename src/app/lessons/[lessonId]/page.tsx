import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { setLessonStudied } from "@/features/courses/actions";
import { CourseRail } from "@/features/courses/components/course-rail";
import { StudiedButton } from "@/features/courses/components/forms";
import { getLessonById } from "@/features/courses/queries";
import { studiedStatusLabel } from "@/features/courses/studied";
import { createNote } from "@/features/notes/actions";
import { CaptureNoteButton } from "@/features/notes/components/capture-note-button";
import { noteKindLabel } from "@/features/notes/kind";
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

  return (
    <div className="grid gap-8">
      <header className="grid gap-2.5">
        <nav className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-soft">
          <Link href={`/courses/${modulo.course.slug}`} className="text-accent">
            {modulo.course.title}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{modulo.title}</span>
        </nav>

        <h1 className="text-xl font-medium tracking-tight">{lesson.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StudiedButton
            action={setLessonStudied}
            id={lesson.id}
            studied={lesson.studiedOn !== null}
          />
          <span role="status" className="text-xs text-ink-soft">
            {studiedStatusLabel(lesson.studiedOn, new Date())}
          </span>
        </div>
      </header>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink pb-2">
          <h2 className="text-lg font-medium">Notas</h2>
          <CaptureNoteButton
            action={createNote}
            lessonId={lesson.id}
            variant="default"
          />
        </div>

        {notas.length === 0 ? (
          <div className="measure pt-4 text-base">
            Esta aula ainda não tem notas. Comece pela anotação da aula:{" "}
            <CaptureNoteButton
              action={createNote}
              lessonId={lesson.id}
              label="escrever a primeira nota"
              inline
            />
            .
          </div>
        ) : (
          <ul>
            {notas.map((nota) => (
              <li
                key={nota.id}
                className="grid gap-0.5 border-b border-rule py-3.5"
              >
                <span className="text-xs text-ink-soft">
                  {noteKindLabel(nota.kind)}
                </span>
                <Link
                  href={`/notes/${nota.id}`}
                  className="truncate rounded-sm text-base font-medium hover:text-accent"
                >
                  {nota.title}
                </Link>
                <span className="text-xs text-ink-soft">{nota.meta}</span>
              </li>
            ))}
          </ul>
        )}
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
      <div className="w-full max-w-220">
        <Suspense fallback={<Carregando>Carregando a aula.</Carregando>}>
          <LessonDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
