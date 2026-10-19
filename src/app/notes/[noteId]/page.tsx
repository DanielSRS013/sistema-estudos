import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CourseRail } from "@/features/courses/components/course-rail";
import { moveNote } from "@/features/notes/actions";
import { NoteMarkdown } from "@/features/notes/components/markdown";
import { MoveNoteForm } from "@/features/notes/components/note-forms";
import { getNoteById, listLessonOptions } from "@/features/notes/queries";
import { cn } from "@/shared/cn";
import { Carregando, Shell } from "@/shared/shell";
import { buttonVariants } from "@/shared/ui/button";

async function MoveNote({
  noteId,
  lessonId,
  lessonPath,
}: {
  noteId: string;
  lessonId: string;
  lessonPath: string;
}) {
  const options = await listLessonOptions();

  // A lista só traz aulas ativas. Se a aula desta nota estiver arquivada, ela
  // não apareceria e o select abriria já apontando para outra — um clique em
  // "Mover nota" tiraria a nota do lugar sem o usuário ter pedido.
  const completo = options.some((option) => option.id === lessonId)
    ? options
    : [{ id: lessonId, path: `${lessonPath} (arquivada)` }, ...options];

  return (
    <MoveNoteForm
      action={moveNote}
      noteId={noteId}
      currentLessonId={lessonId}
      options={completo}
    />
  );
}

async function NoteDetail({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;

  // Id fora do formato não chega a virar consulta.
  if (!z.uuid().safeParse(noteId).success) notFound();

  const note = await getNoteById(noteId);

  if (!note) notFound();

  const { lesson } = note;
  const { module: modulo } = lesson;

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
          {` · ${modulo.title} · `}
          <Link href={`/lessons/${lesson.id}`} className="hover:text-ink">
            {lesson.title}
          </Link>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">
            {note.title}
          </h1>
          <Link
            href={`/notes/${note.id}/edit`}
            className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          >
            <Pencil aria-hidden />
            Editar
          </Link>
        </div>
      </header>

      {note.content.trim() === "" ? (
        <p className="font-serif text-base leading-[1.65] text-ink-soft">
          Esta nota está vazia.{" "}
          <Link href={`/notes/${note.id}/edit`} className="text-accent underline">
            Escrever agora
          </Link>
          .
        </p>
      ) : (
        <NoteMarkdown content={note.content} />
      )}

      <section className="space-y-2 border-t border-rule pt-4">
        <h2 className="text-sm font-medium text-ink-soft">Mover</h2>
        <Suspense
          fallback={<Carregando>Carregando as aulas.</Carregando>}
        >
          <MoveNote
            noteId={note.id}
            lessonId={note.lessonId}
            lessonPath={`${modulo.course.title} · ${modulo.title} · ${lesson.title}`}
          />
        </Suspense>
      </section>
    </div>
  );
}

export default function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      <div className="measure">
        <Suspense fallback={<Carregando>Carregando a nota.</Carregando>}>
          <NoteDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
