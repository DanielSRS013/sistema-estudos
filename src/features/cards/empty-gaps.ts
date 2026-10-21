// A lacuna vazia marcada no texto que a pré-visualização do editor renderiza.
//
// Duas metades, como no cloze: aqui a cirurgia na string, em
// `shared/markdown-empty-gap.ts` o `span` que o render monta. Esta metade mora
// na feature `cards` porque o que ela precisa saber — onde está uma lacuna
// vazia — é conhecimento do parser, e perguntar a ele é o que mantém a marca na
// tela e a reclamação no alerta falando do mesmo trecho.

import { MARCA_VAZIA } from "@/shared/markdown-empty-gap";

import { lacunasVazias } from "./parser";

/**
 * O Markdown da nota com cada lacuna vazia trocada pela marca de controle.
 *
 * Sem lacuna vazia o texto volta idêntico — é o caso de toda nota pronta, e o
 * editor renderiza isto a cada tecla.
 */
export function marcarLacunasVazias(markdown: string): string {
  const achadas = lacunasVazias(markdown);

  if (achadas.length === 0) return markdown;

  let saida = "";
  let cursor = 0;

  for (const lacuna of achadas) {
    saida += markdown.slice(cursor, lacuna.inicio) + MARCA_VAZIA;
    cursor = lacuna.fim;
  }

  return saida + markdown.slice(cursor);
}
