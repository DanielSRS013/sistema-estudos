import { BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CourseRail } from "@/features/courses/components/course-rail";
import { Editor } from "@/features/notes/components/editor";
import { getNoteById } from "@/features/notes/queries";
import { cn } from "@/shared/cn";
import { Carregando, Shell } from "@/shared/shell";
import { buttonVariants } from "@/shared/ui/button";

async function NoteEditor({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;

  if (!z.uuid().safeParse(noteId).success) notFound();

  const note = await getNoteById(noteId);

  if (!note) notFound();

  const { lesson } = note;
  const { module: modulo } = lesson;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <Link
          href={`/notes/${note.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0",
          )}
        >
          <BookOpen aria-hidden />
          Ler
        </Link>
      </div>

      <Editor
        noteId={note.id}
        initialTitle={note.title}
        initialContent={note.content}
      />
    </div>
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
