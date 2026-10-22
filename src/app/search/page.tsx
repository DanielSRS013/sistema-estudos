import Link from "next/link";
import { Suspense } from "react";

import { CourseRail } from "@/features/courses/components/course-rail";
import type { Segmento } from "@/features/search/highlight";
import { searchNotesAndCards } from "@/features/search/queries";
import { Carregando, Shell } from "@/shared/shell";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/cn";

/**
 * Os segmentos vêm do `ts_headline` já recortados — nenhuma string de banco
 * vira HTML aqui, o `<mark>` é elemento React.
 */
function Trecho({ segmentos }: { segmentos: Segmento[] }) {
  return (
    <>
      {segmentos.map((segmento, i) =>
        segmento.destaque ? (
          <mark
            key={i}
            className="rounded-sm bg-accent/15 px-0.5 text-ink dark:bg-accent/30"
          >
            {segmento.texto}
          </mark>
        ) : (
          <span key={i}>{segmento.texto}</span>
        ),
      )}
    </>
  );
}

function Busca({ termo }: { termo: string }) {
  return (
    <form action="/search" className="flex flex-wrap items-center gap-2">
      <label htmlFor="q" className="sr-only">
        Buscar nas notas
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={termo}
        autoFocus
        placeholder="projeção, autovalor, gradiente…"
        className="min-w-0 flex-1 rounded-sm border border-rule bg-paper px-3 py-2 text-sm"
      />
      <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
        Buscar
      </button>
    </form>
  );
}

async function Resultados({ termo }: { termo: string }) {
  const hits = await searchNotesAndCards(termo);

  if (hits.length === 0) {
    return (
      <p className="font-serif text-base leading-prose text-ink-soft">
        Nada encontrado para <span className="font-mono">{termo}</span>. Tente
        outra palavra do conceito, ou uma só palavra em vez da frase.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-ink-soft">
        {hits.length === 1 ? "1 resultado" : `${hits.length} resultados`}
        {hits.length === 30 ? " (primeiros 30)" : ""}
      </p>
      <ul className="space-y-4">
        {hits.map((hit) => (
          <li
            key={hit.key}
            className="space-y-1 border-t border-rule pt-4 first:border-t-0 first:pt-0"
          >
            <Link
              href={`/notes/${hit.noteId}`}
              className="font-medium hover:text-accent"
            >
              <Trecho segmentos={hit.title} />
            </Link>
            <p className="font-mono text-xs text-ink-soft">
              {hit.estado === null ? hit.tipo : `${hit.tipo} · ${hit.estado}`}
              {" · "}
              {hit.path}
            </p>
            <p className="font-serif text-sm leading-prose text-ink-soft">
              <Trecho segmentos={hit.snippet} />
            </p>
            {hit.origem === "card" ? (
              <p className="font-mono text-xs text-ink-soft">
                em <span className="not-italic">{hit.noteTitle}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * O campo e os resultados dependem do termo, então ambos vivem aqui dentro:
 * com `cacheComponents` ligado, ler `searchParams` no corpo da página aborta
 * o prerender da rota.
 */
async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = (q ?? "").trim();

  return (
    <>
      <Busca termo={termo} />

      {termo === "" ? (
        <p className="font-serif text-base leading-prose text-ink-soft">
          Digite uma palavra do conceito. A busca varre título e corpo das notas
          e a face e a resposta dos cards, com radical em português e acento
          opcional: “limites” encontra “limite”, e “projecao” encontra
          “projeção”.
        </p>
      ) : (
        <Suspense
          key={termo}
          fallback={<Carregando>Buscando nas notas e nos cards.</Carregando>}
        >
          <Resultados termo={termo} />
        </Suspense>
      )}
    </>
  );
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Shell rail={<CourseRail />}>
      <div className="measure space-y-6">
        <header className="space-y-1">
          <p className="font-mono text-xs tracking-wide text-ink-soft">busca</p>
          <h1 className="text-xl font-semibold tracking-tight">
            Buscar nas notas
          </h1>
        </header>

        <Suspense fallback={<Carregando>Abrindo a busca.</Carregando>}>
          <Painel searchParams={searchParams} />
        </Suspense>
      </div>
    </Shell>
  );
}
