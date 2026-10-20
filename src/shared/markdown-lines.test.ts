import { describe, expect, it } from "vitest";

import { anotarLinhas, type Raiz } from "./markdown-lines";

function elemento(
  tagName: string,
  line: number | null,
  extras: Partial<Raiz["children"][number]> = {},
): Raiz["children"][number] {
  return {
    type: "element",
    tagName,
    ...(line === null ? {} : { position: { start: { line } } }),
    ...extras,
  };
}

function raiz(...children: Raiz["children"]): Raiz {
  return { type: "root", children };
}

describe("anotarLinhas", () => {
  it("escreve a linha de origem em cada bloco de topo", () => {
    const tree = raiz(elemento("h1", 1), elemento("p", 3));

    anotarLinhas()(tree);

    expect(tree.children.map((no) => no.properties?.["data-line"])).toEqual([
      1, 3,
    ]);
  });

  it("preserva as propriedades que o bloco já tinha", () => {
    const tree = raiz(
      elemento("p", 5, { properties: { className: ["math"] } }),
    );

    anotarLinhas()(tree);

    expect(tree.children[0]?.properties).toEqual({
      className: ["math"],
      "data-line": 5,
    });
  });

  it("não marca bloco sem posição conhecida", () => {
    const tree = raiz(elemento("p", null));

    anotarLinhas()(tree);

    expect(tree.children[0]?.properties).toBeUndefined();
  });

  it("não marca nó que não é elemento", () => {
    const tree = raiz({ type: "text", position: { start: { line: 2 } } });

    anotarLinhas()(tree);

    expect(tree.children[0]?.properties).toBeUndefined();
  });

  it("marca só o topo: o bloco aninhado não ganha endereço próprio", () => {
    const dentro = elemento("p", 4);
    const tree = raiz(elemento("blockquote", 3, { children: [dentro] }));

    anotarLinhas()(tree);

    expect(tree.children[0]?.properties?.["data-line"]).toBe(3);
    expect(dentro.properties).toBeUndefined();
  });
});
