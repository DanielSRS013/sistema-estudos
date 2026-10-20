// Plugin de rehype que escreve a linha de origem em cada bloco de topo do
// render, para a margem de cards saber que trecho está sob a viewport
// (SPEC §6).
//
// Os tipos são estruturais de propósito: `@types/hast` e `unist-util-visit`
// são dependência fora do SPEC, e aqui só duas propriedades do nó interessam.
// Mesma decisão de `tags/linkify.ts`.

type No = {
  type: string;
  tagName?: string;
  position?: { start?: { line?: number } };
  properties?: Record<string, unknown>;
  children?: No[];
};

export type Raiz = { type: "root"; children: No[] };

/**
 * `data-line` nos filhos diretos da raiz, e só neles: o bloco de topo é a
 * granularidade que a margem precisa, e marcar os aninhados multiplicaria
 * alvos de observação sem mudar o destaque.
 */
export function anotarLinhas() {
  return (tree: Raiz): void => {
    for (const no of tree.children) {
      const line = no.position?.start?.line;

      if (no.type !== "element" || line === undefined) continue;

      no.properties = { ...no.properties, "data-line": line };
    }
  };
}
