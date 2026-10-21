import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CardItem } from "@/features/cards/components/card-item";
import { CourseRail } from "@/features/courses/components/course-rail";
import { getTagBySlug } from "@/features/tags/queries";
import { slugify } from "@/shared/slug";
import { Carregando, Shell } from "@/shared/shell";

async function TagDetail({ params }: { params: Promise<{ tagSlug: string }> }) {
  const { tagSlug } = await params;

  // A URL carrega o slug já normalizado. Um slug de outra forma não existe no
  // banco, então nem vira consulta.
  if (tagSlug === "" || slugify(tagSlug) !== tagSlug) notFound();

  const tag = await getTagBySlug(tagSlug);

  if (!tag) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="font-mono text-xs tracking-wide text-ink-soft">conceito</p>
        <h1 className="text-xl font-semibold tracking-tight">#{tag.name}</h1>
        <p className="text-sm text-ink-soft">
          {tag.notes.length === 0
            ? "Nenhuma nota cita este conceito agora."
            : `${tag.notes.length} ${tag.notes.length === 1 ? "nota" : "notas"} · ${tag.cards.length} ${tag.cards.length === 1 ? "card" : "cards"}`}
        </p>
      </header>

      {tag.notes.length === 0 ? (
        <p className="measure font-serif text-base leading-prose text-ink-soft">
          A tag continua valendo: escreva <code className="font-mono">#{tag.slug}</code>{" "}
          em qualquer nota e ela aparece aqui.
        </p>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-ink-soft">Notas</h2>
          <ul className="space-y-3">
            {tag.notes.map((nota) => (
              <li
                key={nota.id}
                className="space-y-0.5 border-t border-rule pt-3 first:border-t-0 first:pt-0"
              >
                <Link
                  href={`/notes/${nota.id}`}
                  className="font-medium hover:text-accent"
                >
                  {nota.title}
                </Link>
                <p className="font-mono text-xs text-ink-soft">{nota.path}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tag.cards.length > 0 ? (
        <section className="space-y-3 border-t border-rule pt-6">
          <h2 className="text-sm font-medium text-ink-soft">
            Cards do conceito
          </h2>
          {/* Card não tem tag própria: estes são os cards das notas acima. */}
          <ul className="space-y-3">
            {tag.cards.map((card) => (
              <CardItem key={card.id} card={card} nota={card.note} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function TagPage({
  params,
}: {
  params: Promise<{ tagSlug: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      <div className="measure">
        <Suspense fallback={<Carregando>Carregando o conceito.</Carregando>}>
          <TagDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
