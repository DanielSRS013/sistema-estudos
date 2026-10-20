// Slug legível em URL, estável e sem acento. Função pura.
//
// Vive em `shared` porque duas features dependem dela: `courses`, que precisa
// de slug único por curso, e `tags`, onde o slug é a identidade do conceito —
// `#Projeção-Vetorial` e `#projecao-vetorial` têm de cair na mesma tag.

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
