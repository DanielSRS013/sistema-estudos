"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { cn } from "@/shared/cn";

import type { RailCourse } from "../queries";

/**
 * Destinos de topo do rail, na ordem do handoff. O painel e a revisão moram
 * aqui porque de dentro de uma nota não havia caminho de volta — SPEC §5 põe
 * as duas na raiz do app.
 */
const NAV = [
  { href: "/", rotulo: "Painel", secao: "painel" },
  { href: "/courses", rotulo: "Cursos", secao: "cursos" },
  { href: "/review", rotulo: "Revisão", secao: "revisao" },
  { href: "/search", rotulo: "Busca", secao: "busca" },
] as const;

const CLASSE_NAV =
  "flex min-h-11 items-center gap-1.5 text-sm rail:min-h-0 rail:justify-between rail:py-1.5";

const CHAVE_COLAPSADO = "rail.collapsed";
const CHAVE_EXPANDIDO = "rail.expanded";

/**
 * As duas medidas da casca, espelhadas de `--breakpoint-rail` e
 * `--breakpoint-cards` em `globals.css`. Só o default do rail no editor
 * depende da faixa em JS; todo o resto é variante `rail:` / `cards:`.
 * `globals.test.ts` compara estas duas strings com os tokens do CSS.
 */
const CONSULTA_RAIL = "(min-width: 56.25rem)";
const CONSULTA_LARGO = "(min-width: 68.75rem)";

/**
 * Qual item do nav acende. Por seção, não por igualdade: `/courses/<slug>`,
 * `/lessons/<id>` e `/notes/<id>` são todos "Cursos".
 */
function secaoDaRota(pathname: string): string {
  if (pathname === "/") return "painel";
  if (pathname.startsWith("/review")) return "revisao";
  if (pathname.startsWith("/search") || pathname.startsWith("/tags")) {
    return "busca";
  }
  if (
    pathname.startsWith("/courses") ||
    pathname.startsWith("/lessons") ||
    pathname.startsWith("/notes")
  ) {
    return "cursos";
  }

  return "";
}

type Local = {
  /** O curso da rota atual — a árvore mostra só ele. */
  curso: RailCourse | null;
  /** Módulo que precisa estar aberto para a rota ficar visível. */
  moduloId: string | null;
  lessonId: string | null;
};

const FORA: Local = { curso: null, moduloId: null, lessonId: null };

/** Onde a rota atual cai na árvore. A nota chega pelo id das notas da aula. */
function localizar(courses: RailCourse[], pathname: string): Local {
  const slug = /^\/courses\/([^/]+)/.exec(pathname)?.[1];

  if (slug) {
    return {
      ...FORA,
      curso: courses.find((curso) => curso.slug === slug) ?? null,
    };
  }

  const aula = /^\/lessons\/([^/]+)/.exec(pathname)?.[1];
  const nota = /^\/notes\/([^/]+)/.exec(pathname)?.[1];

  if (!aula && !nota) return FORA;

  for (const curso of courses) {
    for (const modulo of curso.modules) {
      for (const lesson of modulo.lessons) {
        const bate = aula
          ? lesson.id === aula
          : lesson.notes.some((note) => note.id === nota);

        if (bate) {
          return { curso, moduloId: modulo.id, lessonId: lesson.id };
        }
      }
    }
  }

  return FORA;
}

function ler<T>(chave: string, fallback: T): T {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto === null ? fallback : (JSON.parse(bruto) as T);
  } catch {
    return fallback;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Navegação privada ou armazenamento bloqueado: o rail funciona igual,
    // só não lembra do estado.
  }
}

function assinarFaixa(avisar: () => void): () => void {
  const consultas = [
    window.matchMedia(CONSULTA_RAIL),
    window.matchMedia(CONSULTA_LARGO),
  ];

  for (const consulta of consultas) consulta.addEventListener("change", avisar);

  return () => {
    for (const consulta of consultas) {
      consulta.removeEventListener("change", avisar);
    }
  };
}

/** Entre 900 e 1099px: a faixa em que o editor abre com o rail recolhido. */
function faixaMedia(): boolean {
  return (
    window.matchMedia(CONSULTA_RAIL).matches &&
    !window.matchMedia(CONSULTA_LARGO).matches
  );
}

/** No servidor não há viewport: o rail nasce expandido e a faixa chega depois. */
function faixaMediaNoServidor(): boolean {
  return false;
}

export function Rail({
  courses,
  contagemRevisao,
  rodape,
}: {
  courses: RailCourse[];
  /** Cards que ainda cabem hoje — o mesmo número que o painel mostra. */
  contagemRevisao: number;
  /** Pé do rail, montado no servidor: tema e sair, empilhados. */
  rodape: React.ReactNode;
}) {
  const pathname = usePathname();
  const montado = useRef(false);
  // `null` é "o usuário nunca escolheu": é o que deixa o editor abrir
  // recolhido entre 900 e 1099px sem atropelar quem já escolheu.
  const [preferencia, setPreferencia] = useState<boolean | null>(null);
  const [expandido, setExpandido] = useState<string[]>([]);
  const [rotaVista, setRotaVista] = useState(pathname);

  const meio = useSyncExternalStore(
    assinarFaixa,
    faixaMedia,
    faixaMediaNoServidor,
  );

  const local = localizar(courses, pathname);
  const noEditor = /^\/notes\/[^/]+\/edit/.test(pathname);
  const colapsado = preferencia ?? (meio && noEditor);
  const secao = secaoDaRota(pathname);

  // O estado de expansão vive no localStorage, não no servidor: ler dentro do
  // primeiro efeito evita divergência de hidratação.
  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    setPreferencia(ler<boolean | null>(CHAVE_COLAPSADO, null));
    setExpandido(ler(CHAVE_EXPANDIDO, local.moduloId ? [local.moduloId] : []));
  }, [local.moduloId]);

  // Navegar para uma aula abre o caminho até ela. Ajuste em render, porque a
  // rota é a entrada e não um sistema externo a sincronizar.
  const moduloDaRota = local.moduloId;

  if (rotaVista !== pathname) {
    setRotaVista(pathname);
    if (moduloDaRota !== null && !expandido.includes(moduloDaRota)) {
      setExpandido((atual) => [...atual, moduloDaRota]);
    }
  }

  const alternarModulo = useCallback((id: string) => {
    setExpandido((atual) => {
      const proximo = atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual, id];
      gravar(CHAVE_EXPANDIDO, proximo);

      return proximo;
    });
  }, []);

  const alternarRail = useCallback(() => {
    setPreferencia((atual) => {
      // O estado de partida é o que está na tela: inverter o que se vê.
      const proximo = !(atual ?? (faixaMedia() && noEditor));
      gravar(CHAVE_COLAPSADO, proximo);

      return proximo;
    });
  }, [noEditor]);

  // Recolhido é decisão de ≥900px. Abaixo disso o rail é a barra do topo e
  // continua inteira, mesmo com a preferência gravada — senão, no telefone, a
  // navegação virava um botão só.
  const somenteAberto = colapsado ? "rail:hidden" : "";

  return (
    <nav
      aria-label="Navegação"
      className={cn(
        "flex flex-wrap items-center gap-x-4 border-b border-rule px-4 py-1",
        "rail:flex-col rail:shrink-0 rail:items-stretch rail:gap-7 rail:border-r rail:border-b-0",
        colapsado
          ? "rail:w-12 rail:px-2 rail:py-5"
          : "rail:w-50 rail:px-5 rail:py-6 cards:w-60",
      )}
    >
      {colapsado ? (
        <button
          type="button"
          onClick={alternarRail}
          aria-label="Expandir menu"
          aria-expanded={false}
          className="hidden size-8 items-center justify-center rounded-sm border border-rule text-sm rail:flex"
        >
          <span aria-hidden>»</span>
        </button>
      ) : null}

      <div
        className={cn(
          "mr-auto flex items-center gap-2",
          "rail:mr-0 rail:w-full rail:justify-between",
          somenteAberto,
        )}
      >
        <span className="text-sm font-semibold">Estudos</span>
        <button
          type="button"
          onClick={alternarRail}
          aria-expanded
          className="hidden text-xs text-ink-soft hover:text-ink rail:block rail:py-1"
        >
          Recolher
        </button>
      </div>

      <div
        className={cn(
          "flex items-center gap-x-4",
          "rail:order-4 rail:mt-auto rail:grid rail:gap-0.5",
          somenteAberto,
        )}
      >
        {rodape}
      </div>

      <ul
        className={cn(
          "flex w-full flex-wrap gap-x-5",
          "rail:order-2 rail:grid rail:w-auto rail:gap-0.5",
          somenteAberto,
        )}
      >
        {NAV.map((item) => {
          const ativo = secao === item.secao;
          const contagem = item.secao === "revisao" ? contagemRevisao : 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(CLASSE_NAV, ativo && "font-medium text-accent")}
              >
                <span>{item.rotulo}</span>
                {contagem > 0 ? (
                  <span className="text-xs font-normal text-ink-soft">
                    {contagem}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* A árvore só existe nas telas de curso, nota, aula e editor, e só do
          curso atual. Abaixo de 900px a barra do topo não a mostra. */}
      {local.curso === null ? null : (
        <div
          className={cn(
            "hidden text-xs",
            !colapsado && "rail:order-3 rail:grid rail:gap-1.5",
          )}
        >
          <Link
            href={`/courses/${local.curso.slug}`}
            aria-current={
              pathname === `/courses/${local.curso.slug}` ? "page" : undefined
            }
            className={cn(
              "truncate text-ink-soft hover:text-ink",
              pathname === `/courses/${local.curso.slug}` &&
                "font-medium text-accent",
            )}
          >
            {local.curso.title}
          </Link>

          {local.curso.modules.length === 0 ? (
            <p className="text-ink-soft">Sem módulos.</p>
          ) : (
            <ul>
              {local.curso.modules.map((modulo) => {
                const aberto = expandido.includes(modulo.id);

                return (
                  <li key={modulo.id}>
                    <button
                      type="button"
                      onClick={() => alternarModulo(modulo.id)}
                      aria-expanded={aberto}
                      className="flex w-full items-start gap-1.5 py-1 text-left"
                    >
                      <span aria-hidden className="w-2.5 shrink-0 text-ink-soft">
                        {aberto ? "▾" : "▸"}
                      </span>
                      <span className="min-w-0">{modulo.title}</span>
                    </button>

                    {aberto ? (
                      <ul className="grid pb-1.5 pl-4">
                        {modulo.lessons.length === 0 ? (
                          <li className="py-0.5 text-ink-soft">Sem aulas.</li>
                        ) : (
                          modulo.lessons.map((lesson) => {
                            const ativa = local.lessonId === lesson.id;

                            return (
                              <li key={lesson.id}>
                                <Link
                                  href={`/lessons/${lesson.id}`}
                                  aria-current={ativa ? "page" : undefined}
                                  className={cn(
                                    "block truncate py-0.5",
                                    ativa
                                      ? "font-medium text-accent"
                                      : "text-ink-soft hover:text-ink",
                                  )}
                                >
                                  {lesson.title}
                                </Link>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </nav>
  );
}
