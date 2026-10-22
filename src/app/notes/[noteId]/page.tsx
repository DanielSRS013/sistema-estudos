import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { marcarCardsNoCorpo } from "@/features/cards/body-marks";
import { NoteCardsSection } from "@/features/cards/components/margin";
import { NoteBody } from "@/features/cards/components/note-body";
import { listCardsForNote } from "@/features/cards/queries";
import { CourseRail } from "@/features/courses/components/course-rail";
import { moveNote } from "@/features/notes/actions";
import { MoveNoteForm } from "@/features/notes/components/note-forms";
import { noteEditedLabel } from "@/features/notes/edited";
import { noteKindLabel } from "@/features/notes/kind";
import { getNoteById, listLessonOptions } from "@/features/notes/queries";
import { extractTags } from "@/features/tags/extract";
import { linkifyTags } from "@/features/tags/linkify";
import { Carregando, Shell } from "@/shared/shell";

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

/** As tags da nota em bloco ao fim do corpo, como o handoff desenha. */
function TagBlock({ content }: { content: string }) {
  const tags = extractTags(content);

  if (tags.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 border-t border-rule pt-4 font-sans text-sm">
      {tags.map((tag) => (
        <Link key={tag.slug} href={`/tags/${tag.slug}`} className="text-accent">
          #{tag.name}
        </Link>
      ))}
    </div>
  );
}

async function NoteDetail({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;

  // Id fora do formato não chega a virar consulta.
  if (!z.uuid().safeParse(noteId).success) notFound();

  // O meta do cabeçalho compara `updatedAt` com o agora da requisição: a
  // leitura é dinâmica, como em `listCardsForNote`.
  await connection();

  const [note, cards] = await Promise.all([
    getNoteById(noteId),
    listCardsForNote(noteId),
  ]);

  if (!note) notFound();

  const { lesson } = note;
  const { module: modulo } = lesson;
  const total = cards.active.length;

  // As marcas de card vêm antes do linkify: `marcarCardsNoCorpo` recorta por
  // posição do texto cru, e linkar as tags já teria movido tudo de lugar.
  const corpo = linkifyTags(marcarCardsNoCorpo(note.content));

  return (
    <article className="space-y-6">
      <header className="max-w-170 space-y-2">
        {/* Dois níveis, curso · aula, ambos links: o módulo fica de fora, como
            no fio do editor. */}
        <nav className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-soft">
          <Link href={`/courses/${modulo.course.slug}`} className="text-accent">
            {modulo.course.title}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={`/lessons/${lesson.id}`} className="text-accent">
            {lesson.title}
          </Link>
        </nav>

        <h1 className="font-serif text-2xl leading-tight font-medium">
          {note.title}
        </h1>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          <span>{noteKindLabel(note.kind)}</span>
          <span>{noteEditedLabel(note.updatedAt, new Date())}</span>
          <span>
            {total} {total === 1 ? "card" : "cards"}
          </span>
          <Link href={`/notes/${note.id}/edit`} className="text-accent">
            Editar
          </Link>
        </div>
      </header>

      {note.content.trim() === "" ? (
        <p className="measure font-serif text-base leading-prose text-ink-soft">
          Esta nota está vazia.{" "}
          <Link href={`/notes/${note.id}/edit`} className="text-accent underline">
            Escrever agora
          </Link>
          .
        </p>
      ) : (
        <NoteBody content={corpo} cards={cards.active}>
          <TagBlock content={note.content} />
        </NoteBody>
      )}

      {/* Abaixo de 1100px a margem some, os cards não — SPEC §6. */}
      <NoteCardsSection noteId={note.id} />

      <section className="max-w-170 space-y-2 border-t border-rule pt-4">
        <h2 className="text-xs text-ink-soft">Mover</h2>
        <Suspense fallback={<Carregando>Carregando as aulas.</Carregando>}>
          <MoveNote
            noteId={note.id}
            lessonId={note.lessonId}
            lessonPath={`${modulo.course.title} · ${modulo.title} · ${lesson.title}`}
          />
        </Suspense>
      </section>
    </article>
  );
}

export default function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      <Suspense fallback={<Carregando>Carregando a nota.</Carregando>}>
        <NoteDetail params={params} />
      </Suspense>
    </Shell>
  );
}
