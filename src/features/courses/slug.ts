// Slug de curso: único por construção. A normalização em si vive em
// `@/shared/slug`, porque as tags usam a mesma.

import { slugify } from "@/shared/slug";

/**
 * Devolve `base` se estiver livre; senão sufixa com o menor inteiro ≥ 2 que
 * não colida. Título sem nenhum caractere aproveitável cai em "curso".
 */
export function uniqueSlug(base: string, taken: readonly string[]): string {
  const root = slugify(base) || "curso";
  const used = new Set(taken);

  if (!used.has(root)) return root;

  for (let n = 2; ; n += 1) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
