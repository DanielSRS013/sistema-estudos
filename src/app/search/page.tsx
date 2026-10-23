import Link from "next/link";
import { Suspense } from "react";

import { CourseRail } from "@/features/courses/components/course-rail";
import type { Segmento } from "@/features/search/highlight";
import { searchNotesAndCards, type SearchHit } from "@/features/search/queries";
import { sugerirConceito } from "@/features/tags/queries";
import { Carregando, Shell } from "@/shared/shell";

/**
 * Os segmentos vêm do `ts_headline` já recortados por `splitHighlight` —
 * nenhuma string de banco vira HTML aqui, o `<mark>` é elemento React.
 *
 * O fundo é `--rule`, não o accent: SPEC §6 reserva o accent a link, foco e
 * item ativo, e um destaque azul no meio do resultado competiria com o título,
 * que é link de verdade. O peso 600 e o fundo do filete bastam nos dois temas.
 */
function Trecho({ segmentos }: { segmentos: Segmento[] }) {
  return (
    <>
      {segmentos.map((segmento, i) =>
        segmento.destaque ? (
          <mark key={i} className="bg-rule px-0.5 font-semibold text-inherit">
            {segmento.texto}
          </mark>
        ) : (
          <span key={i}>{segmento.texto}</span>
        ),
      )}
    </>
  );
}

/**
 * O campo, sozinho: rótulo visível, `type=search` de 17px e alvo de 44px.
 *
 * Sem botão de propósito — o handoff não desenha nenhum, e um formulário com um
 * único campo de texto submete no Enter sem JavaScript. Sem exemplo dentro do
 * campo também: a lista de termos que ele mostrava ("projeção, autovalor…")
 * sumia na primeira tecla, e o que a busca varre está escrito no rótulo e no
 * texto de saída, que ficam.
 */
function Busca({ termo }: { termo: string }) {
  return (
    <form action="/search" role="search">
      <label htmlFor="q" className="mb-1.5 block text-xs text-ink-soft">
        Buscar em notas e cards
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={termo}
        autoFocus
        className="min-h-11 w-full rounded-sm border border-ink-soft bg-paper px-3 py-2 text-base"
      />
    </form>
  );
}

/**
 * "Pergunta · revisão · de Projeção escalar e vetorial" no card, "Resumo ·
 * Álgebra linear · Vetores · Projeções" na nota — o tipo à frente nas duas.
 *
 * O card troca o caminho pela nota de origem, como o handoff escreve: o
 * caminho dele é o da nota que o gerou, e repetir curso · módulo · aula *mais*
 * a nota faria a linha de meta passar do título. O link do resultado já vai
 * para essa nota.
 */
function meta(hit: SearchHit): string {
  return hit.origem === "card"
    ? `${hit.tipo} · ${hit.estado} · de ${hit.noteTitle}`
    : `${hit.tipo} · ${hit.path}`;
}

/** A saída que o handoff oferece quando nada casa: um conceito para abrir. */
async function SemResultado({ termo }: { termo: string }) {
  const conceito = await sugerirConceito(termo);

  return (
    <p className="text-base">
      Nada encontrado para “{termo}”. Tente um termo mais curto
      {conceito === null ? (
        "."
      ) : (
        <>
          {" ou abra o conceito "}
          <Link href={`/tags/${conceito}`} className="text-accent underline">
            #{conceito}
          </Link>
          .
        </>
      )}
    </p>
  );
}

async function Resultados({ termo }: { termo: string }) {
  const hits = await searchNotesAndCards(termo);

  if (hits.length === 0) return <SemResultado termo={termo} />;

  return (
    <>
      {/* `role="status"` porque a contagem é o que muda quando a busca
          responde: sem ele quem usa leitor de tela submete e não ouve nada. */}
      <p role="status" className="text-xs text-ink-soft">
        {hits.length === 1 ? "1 resultado" : `${hits.length} resultados`} para “
        {termo}” em notas e cards
      </p>
      <ol className="border-t border-ink">
        {hits.map((hit) => (
          <li key={hit.key} className="grid gap-1 border-b border-rule py-4">
            <span className="text-xs text-ink-soft">{meta(hit)}</span>
            <Link
              href={`/notes/${hit.noteId}`}
              className="text-base font-medium hover:text-accent"
            >
              <Trecho segmentos={hit.title} />
            </Link>
            <p className="font-serif text-sm leading-snippet">
              <Trecho segmentos={hit.snippet} />
            </p>
          </li>
        ))}
      </ol>
    </>
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
        <p className="text-base">
          Digite um termo para buscar em todas as notas e cards. Acentos são
          opcionais.
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
      {/* 760px e intervalo de 20: a tela é lista de resultados, não coluna de
          leitura, e por isso não usa a medida de 68ch da nota. */}
      <div className="grid w-full max-w-190 gap-5">
        <h1 className="text-xl font-medium">Busca</h1>

        <Suspense fallback={<Carregando>Abrindo a busca.</Carregando>}>
          <Painel searchParams={searchParams} />
        </Suspense>
      </div>
    </Shell>
  );
}
