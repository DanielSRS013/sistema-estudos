// O realce do bloco de código na árvore do render.
//
// Metade de árvore do par cujo miolo puro é `features/notes/code.ts`: lá a
// varredura que diz qual trecho é comentário, string, palavra-chave ou número;
// aqui os `span` que levam as classes para o CSS.
//
// A varredura chega por argumento, e não por import, porque `shared` não
// depende de feature — é a regra de pastas do CLAUDE.md. De quebra, o plugin
// fica testável com qualquer varredura.
//
// Só bloco cercado: `code` dentro de `pre`. Código inline fica como está, que é
// o que o handoff desenha (fundo `--muted`, sem realce).
//
// Os tipos do hast são estruturais de propósito, como nos módulos vizinhos:
// `@types/hast` é dependência fora do SPEC.

import type { No, Raiz } from "./markdown-cloze";

/** O que a varredura devolve: o código em trechos, com a classe de cada um. */
export type TrechoDeCodigo = { classe: string | null; texto: string };

export type Varredura = (codigo: string) => TrechoDeCodigo[];

function span(trecho: TrechoDeCodigo): No {
  if (trecho.classe === null) return { type: "text", value: trecho.texto };

  return {
    type: "element",
    tagName: "span",
    properties: { className: [`cod-${trecho.classe}`] },
    children: [{ type: "text", value: trecho.texto }],
  };
}

/** Os filhos de um `code` trocados pelos trechos realçados. */
function realcarCode(no: No, varredura: Varredura): void {
  const filhos = no.children;

  if (filhos === undefined) return;

  no.children = filhos.flatMap((filho) => {
    const valor = filho.value;

    if (filho.type !== "text" || valor === undefined) return [filho];

    return varredura(valor).map(span);
  });
}

function percorrer(no: No, varredura: Varredura): void {
  const filhos = no.children;

  if (filhos === undefined) return;

  for (const filho of filhos) {
    if (no.tagName === "pre" && filho.tagName === "code") {
      realcarCode(filho, varredura);
      continue;
    }

    percorrer(filho, varredura);
  }
}

/** Plugin de rehype: cada bloco cercado sai em trechos com classe. */
export function realcarBlocos(varredura: Varredura) {
  return () =>
    (tree: Raiz): void => {
      percorrer(tree, varredura);
    };
}
