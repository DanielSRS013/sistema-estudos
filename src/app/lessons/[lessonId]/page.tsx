import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import {
  moveLesson,
  renameLesson,
  setLessonArchived,
} from "@/features/courses/actions";
import {
  ArchiveButton,
  MoveButtons,
  RenameForm,
} from "@/features/courses/components/forms";
import { Carregando, Shell } from "@/features/courses/components/shell";
import { getLessonById } from "@/features/courses/queries";

async function LessonDetail({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;

  // Id fora do formato não chega a virar consulta: o banco recusaria o texto e
  // isso apareceria como erro, não como 404.
  if (!z.uuid().safeParse(lessonId).success) notFound();

  const lesson = await getLessonById(lessonId);

  if (!lesson) notFound();

  const { module: modulo } = lesson;
  const irmas = modulo.lessons;
  const indice = irmas.findIndex((irma) => irma.id === lesson.id);
  const arquivada = lesson.archivedAt !== null;

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
            <h1 className="truncate text-2xl font-semibold tracking-tight">
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
      </header>

      <section className="space-y-2 border-t border-rule pt-4">
        <h2 className="text-sm font-medium text-ink-soft">Notas</h2>
        <p className="font-serif text-base leading-[1.65] text-ink-soft">
          Esta aula ainda não tem notas. O editor de Markdown com LaTeX chega na
          fatia 2.
        </p>
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
    <Shell>
      <div className="measure">
        <Suspense fallback={<Carregando>Carregando a aula.</Carregando>}>
          <LessonDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
