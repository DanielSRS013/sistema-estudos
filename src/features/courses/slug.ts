// Slug de curso: estável, legível na URL e único por construção.
// Função pura — o chamador é quem sabe quais slugs já existem.

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
