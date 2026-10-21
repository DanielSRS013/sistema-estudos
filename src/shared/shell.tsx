import { Suspense } from "react";

/**
 * Casca das rotas de conteúdo: o rail à esquerda a partir de 900px, barra no
 * topo abaixo disso, e a coluna de leitura ao lado.
 *
 * O rail entra por prop: quem monta a árvore é a feature de cursos, e esta
 * casca não precisa saber disso para servir também às notas.
 *
 * Três degraus de padding de conteúdo, do handoff: 40/56/80 em ≥1100,
 * 32/32/64 entre 900 e 1099, 20/16/56 abaixo de 900.
 *
 * `cacheComponents` está ligado, então toda leitura de banco vive sob uma
 * fronteira de Suspense — sem ela o Next recusa o prerender da rota.
 */
export function Shell({
  rail,
  children,
}: {
  rail: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col rail:flex-row">
      <Suspense
        fallback={
          <div
            aria-hidden
            className="border-b border-rule px-4 py-1 rail:w-50 rail:shrink-0 rail:border-r rail:border-b-0 rail:px-5 rail:py-6 cards:w-60"
          >
            <p className="text-sm font-semibold">Estudos</p>
          </div>
        }
      >
        {rail}
      </Suspense>
      <main className="min-w-0 flex-1 px-4 pt-5 pb-14 rail:px-8 rail:pt-8 rail:pb-16 cards:px-14 cards:pt-10 cards:pb-20">
        {children}
      </main>
    </div>
  );
}

/** Espera padrão do conteúdo das páginas. */
export function Carregando({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-soft">{children}</p>;
}
