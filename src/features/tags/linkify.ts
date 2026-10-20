// Tag inline vira link antes do render: `#norma` → `[#norma](/tags/norma)`.
//
// Função pura, string entra, string sai. A alternativa seria um plugin de
// rehype, que exigiria `@types/hast` e `unist-util-visit` — dependência fora
// do SPEC. Aqui o custo é zero e a varredura é literalmente a mesma de
// `extractTags`, então o que a nota registra como tag e o que fica clicável
// não podem discordar.

import { findTags, mascarar } from "./extract";

export function linkifyTags(markdown: string): string {
  const achadas = findTags(mascarar(markdown));

  if (achadas.length === 0) return markdown;

  let saida = "";
  let cursor = 0;

  for (const tag of achadas) {
    saida += markdown.slice(cursor, tag.inicio);
    saida += `[#${tag.name}](/tags/${tag.slug})`;
    cursor = tag.fim;
  }

  return saida + markdown.slice(cursor);
}
