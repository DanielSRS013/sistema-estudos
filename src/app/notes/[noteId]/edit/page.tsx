import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CourseRail } from "@/features/courses/components/course-rail";
import { Editor } from "@/features/notes/components/editor";
import { getNoteById } from "@/features/notes/queries";
import { Carregando, Shell } from "@/shared/shell";

async function NoteEditor({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;

  if (!z.uuid().safeParse(noteId).success) notFound();

  const note = await getNoteById(noteId);

  if (!note) notFound();

  const { lesson } = note;
  const { module: modulo } = lesson;

  // O cabeçalho inteiro — fio, título, indicador e "Ver nota" — mora no editor:
  // o indicador é estado do cliente, e o handoff põe os quatro na mesma linha.
  return (
    <Editor
      noteId={note.id}
      initialTitle={note.title}
      initialContent={note.content}
      trilha={{
        courseTitle: modulo.course.title,
        courseHref: `/courses/${modulo.course.slug}`,
        lessonTitle: lesson.title,
        lessonHref: `/lessons/${lesson.id}`,
      }}
    />
  );
}

export default function NoteEditPage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      <Suspense fallback={<Carregando>Carregando a nota.</Carregando>}>
        <NoteEditor params={params} />
      </Suspense>
    </Shell>
  );
}
