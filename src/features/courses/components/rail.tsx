"use client";

import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/cn";

import type { RailCourse } from "../queries";

const CHAVE_COLAPSADO = "rail.collapsed";
const CHAVE_EXPANDIDO = "rail.expanded";

/** Ids que precisam estar abertos para a rota atual ficar visível. */
function ancestrais(courses: RailCourse[], pathname: string): string[] {
  const curso = /^\/courses\/([^/]+)/.exec(pathname)?.[1];

  if (curso) {
    const encontrado = courses.find((c) => c.slug === curso);
    return encontrado ? [encontrado.id] : [];
  }

  const aula = /^\/lessons\/([^/]+)/.exec(pathname)?.[1];

  if (!aula) return [];

  for (const course of courses) {
    for (const modulo of course.modules) {
      if (modulo.lessons.some((lesson) => lesson.id === aula)) {
        return [course.id, modulo.id];
      }
    }
  }

  return [];
}

function ler<T>(chave: string, fallback: T): T {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto === null ? fallback : (JSON.parse(bruto) as T);
  } catch {
    return fallback;
  }
}

export function Rail({ courses }: { courses: RailCourse[] }) {
  const pathname = usePathname();
  const montado = useRef(false);
  const [hidratado, setHidratado] = useState(false);
  const [colapsado, setColapsado] = useState(false);
  const [expandido, setExpandido] = useState<string[]>([]);
  const [rotaVista, setRotaVista] = useState(pathname);

  // O estado de expansão vive no localStorage, não no servidor: ler dentro do
  // primeiro efeito evita divergência de hidratação.
  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    setColapsado(ler(CHAVE_COLAPSADO, false));
    setExpandido(ler(CHAVE_EXPANDIDO, ancestrais(courses, pathname)));
    setHidratado(true);
  }, [courses, pathname]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CHAVE_COLAPSADO, JSON.stringify(colapsado));
      window.localStorage.setItem(CHAVE_EXPANDIDO, JSON.stringify(expandido));
    } catch {
      // Navegação privada ou armazenamento bloqueado: o rail funciona igual,
      // só não lembra do estado.
    }
  }, [hidratado, colapsado, expandido]);

  // Navegar para uma aula abre o caminho até ela. Ajuste em render, porque a
  // rota é a entrada e não um sistema externo a sincronizar.
  if (rotaVista !== pathname) {
    setRotaVista(pathname);
    const abrir = ancestrais(courses, pathname);
    if (abrir.length > 0) {
      setExpandido((atual) => [...new Set([...atual, ...abrir])]);
    }
  }

  const alternar = useCallback((id: string) => {
    setExpandido((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );
  }, []);

  if (colapsado) {
    return (
      <div className="border-b border-rule px-3 py-2 md:w-12 md:border-r md:border-b-0">
        <button
          type="button"
          onClick={() => setColapsado(false)}
          aria-label="Mostrar navegação"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-ink-soft",
          )}
        >
          <PanelLeftOpen aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <nav
      aria-label="Cursos, módulos e aulas"
      className="border-b border-rule px-3 py-3 text-sm md:w-64 md:shrink-0 md:border-r md:border-b-0"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/courses"
            className="rounded-sm px-1 font-mono text-xs tracking-wide text-ink-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            cursos
          </Link>
          <Link
            href="/search"
            aria-current={pathname === "/search" ? "page" : undefined}
            className={cn(
              "rounded-sm px-1 font-mono text-xs tracking-wide text-ink-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none",
              pathname === "/search" && "text-accent",
            )}
          >
            buscar
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setColapsado(true)}
          aria-label="Esconder navegação"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-xs" }),
            "text-ink-soft",
          )}
        >
          <PanelLeftClose aria-hidden />
        </button>
      </div>

      {courses.length === 0 ? (
        <p className="px-1 text-xs text-ink-soft">
          Nenhum curso ainda.{" "}
          <Link href="/courses" className="text-accent underline">
            Criar o primeiro
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-0.5">
          {courses.map((course) => {
            const aberto = expandido.includes(course.id);
            const ativo = pathname === `/courses/${course.slug}`;

            return (
              <li key={course.id}>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => alternar(course.id)}
                    aria-expanded={aberto}
                    aria-label={`${aberto ? "Recolher" : "Expandir"} ${course.title}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-xs" }),
                      "text-ink-soft",
                    )}
                  >
                    {aberto ? (
                      <ChevronDown aria-hidden />
                    ) : (
                      <ChevronRight aria-hidden />
                    )}
                  </button>
                  <Link
                    href={`/courses/${course.slug}`}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-sm px-1 py-0.5 hover:bg-muted focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none",
                      ativo && "font-medium text-accent",
                    )}
                  >
                    {course.title}
                  </Link>
                </div>

                {aberto ? (
                  <ul className="ml-4 space-y-0.5 border-l border-rule pl-1">
                    {course.modules.length === 0 ? (
                      <li className="px-2 py-0.5 text-xs text-ink-soft">
                        Sem módulos.
                      </li>
                    ) : (
                      course.modules.map((modulo) => {
                        const moduloAberto = expandido.includes(modulo.id);

                        return (
                          <li key={modulo.id}>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => alternar(modulo.id)}
                                aria-expanded={moduloAberto}
                                aria-label={`${moduloAberto ? "Recolher" : "Expandir"} ${modulo.title}`}
                                className={cn(
                                  buttonVariants({
                                    variant: "ghost",
                                    size: "icon-xs",
                                  }),
                                  "text-ink-soft",
                                )}
                              >
                                {moduloAberto ? (
                                  <ChevronDown aria-hidden />
                                ) : (
                                  <ChevronRight aria-hidden />
                                )}
                              </button>
                              <span className="min-w-0 flex-1 truncate px-1 py-0.5 text-ink-soft">
                                {modulo.title}
                              </span>
                            </div>

                            {moduloAberto ? (
                              <ul className="ml-4 space-y-0.5 border-l border-rule pl-1">
                                {modulo.lessons.length === 0 ? (
                                  <li className="px-2 py-0.5 text-xs text-ink-soft">
                                    Sem aulas.
                                  </li>
                                ) : (
                                  modulo.lessons.map((lesson) => {
                                    const aulaAtiva =
                                      pathname === `/lessons/${lesson.id}`;

                                    return (
                                      <li key={lesson.id}>
                                        <Link
                                          href={`/lessons/${lesson.id}`}
                                          aria-current={
                                            aulaAtiva ? "page" : undefined
                                          }
                                          className={cn(
                                            "block truncate rounded-sm px-2 py-0.5 hover:bg-muted focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none",
                                            aulaAtiva &&
                                              "font-medium text-accent",
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
                      })
                    )}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
