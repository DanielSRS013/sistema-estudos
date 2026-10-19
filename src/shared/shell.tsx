import { Suspense } from "react";

/**
 * Casca das rotas de conteúdo: navegação à esquerda (acima, no telefone) e a
 * coluna de leitura ao lado. A margem direita com os cards chega na fatia 3.
 *
 * O rail entra por prop: quem monta a árvore é a feature de cursos, e esta
 * casca não precisa saber disso para servir também às notas.
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
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Suspense
        fallback={
          <div
            aria-hidden
            className="border-b border-rule px-3 py-3 md:w-64 md:shrink-0 md:border-r md:border-b-0"
          >
            <p className="font-mono text-xs text-ink-soft">cursos</p>
          </div>
        }
      >
        {rail}
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}

/** Espera padrão do conteúdo das páginas. */
export function Carregando({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-soft">{children}</p>;
}
