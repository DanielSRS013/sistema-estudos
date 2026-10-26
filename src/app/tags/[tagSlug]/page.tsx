import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CourseRail } from "@/features/courses/components/course-rail";
import { noteKindLabel } from "@/features/notes/kind";
import { TagCardRow } from "@/features/tags/components/tag-card";
import { getTagBySlug } from "@/features/tags/queries";
import { slugify } from "@/shared/slug";
import { Carregando, Shell } from "@/shared/shell";

/** "3 notas", "1 card" — a contagem da frase do cabeçalho. */
function contagem(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function Secao({
  id,
  titulo,
  vazio,
  total,
  children,
}: {
  id: string;
  titulo: string;
  /** A linha neutra que entra no lugar da lista quando não há item. */
  vazio: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="border-b border-ink pb-2 text-lg font-medium"
      >
        {titulo}
      </h2>
      {/* Sem item, não sai `<ul>`: uma lista de zero itens é anunciada como
          "lista, 0 itens" e, na tela, lê como carregamento que falhou. */}
      {total === 0 ? (
        <p className="border-b border-rule py-3.5 text-sm text-ink-soft">
          {vazio}
        </p>
      ) : (
        <ul>{children}</ul>
      )}
    </section>
  );
}

async function TagDetail({ params }: { params: Promise<{ tagSlug: string }> }) {
  const { tagSlug } = await params;

  // A URL carrega o slug já normalizado. Um slug de outra forma não existe no
  // banco, então nem vira consulta.
  if (tagSlug === "" || slugify(tagSlug) !== tagSlug) notFound();

  const tag = await getTagBySlug(tagSlug);

  if (!tag) notFound();

  return (
    <>
      <header className="grid gap-1.5">
        <p className="text-xs text-ink-soft">Conceito</p>
        <h1 className="text-xl font-medium">#{tag.name}</h1>
        <p className="text-sm text-ink-soft">
          Citado em {contagem(tag.notes.length, "nota", "notas")} e{" "}
          {contagem(tag.cards.length, "card", "cards")}
        </p>
      </header>

      {/* As duas seções ficam de pé mesmo vazias: o cabeçalho já disse que são
          zero, e sumir com a seção faz a página parecer outra a cada visita.
          Antes a de notas virava um texto que imprimia o slug onde o usuário
          tinha escrito outra coisa, e a de cards simplesmente não existia. */}
      <Secao
        id="notas-do-conceito"
        titulo="Notas"
        total={tag.notes.length}
        vazio="Nenhuma nota com este conceito."
      >
        {tag.notes.map((nota) => (
          <li
            key={nota.id}
            className="grid gap-0.5 border-b border-rule py-3.5"
          >
            <span className="text-xs text-ink-soft">
              {noteKindLabel(nota.kind)} · {nota.path}
            </span>
            <Link
              href={`/notes/${nota.id}`}
              className="text-base font-medium hover:text-accent"
            >
              {nota.title}
            </Link>
          </li>
        ))}
      </Secao>

      {/* Card não tem tag própria: estes são os cards das notas acima. */}
      <Secao
        id="cards-do-conceito"
        titulo="Cards"
        total={tag.cards.length}
        vazio="Nenhum card nas notas com este conceito."
      >
        {tag.cards.map((card) => (
          <TagCardRow key={card.id} card={card} />
        ))}
      </Secao>
    </>
  );
}

export default function TagPage({
  params,
}: {
  params: Promise<{ tagSlug: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      {/* 880px e intervalo de 32, como o painel: a página do conceito é lista
          de notas e cards, não coluna de leitura. */}
      <div className="grid w-full max-w-220 gap-8">
        <Suspense fallback={<Carregando>Carregando o conceito.</Carregando>}>
          <TagDetail params={params} />
        </Suspense>
      </div>
    </Shell>
  );
}
