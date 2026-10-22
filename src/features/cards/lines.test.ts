import { describe, expect, it } from "vitest";

import { blocoDe, cardLines, lineOf } from "./lines";
import { anchorKey } from "./reconcile";

const NOTA = [
  "# Projeção vetorial",
  "",
  "A projeção de {{a}} sobre {{b}} usa o produto interno.",
  "",
  "Q:: O que o produto interno mede?",
  "A:: Quanto de um vetor aponta na direção do outro.",
].join("\n");

describe("cardLines", () => {
  it("aponta a linha de origem pela âncora do card", () => {
    const lines = cardLines(NOTA);

    expect(
      lineOf(lines, {
        anchorKey: anchorKey(
          "A projeção de […] sobre b usa o produto interno.",
          "a",
        ),
        ordinal: 0,
      }),
    ).toBe(3);
  });

  it("aponta o par Q::/A:: na linha da pergunta", () => {
    const lines = cardLines(NOTA);

    expect(
      lineOf(lines, {
        anchorKey: anchorKey(
          "O que o produto interno mede?",
          "Quanto de um vetor aponta na direção do outro.",
        ),
        ordinal: 2,
      }),
    ).toBe(5);
  });

  it("cai na posição quando a âncora do banco não casa com o texto", () => {
    const lines = cardLines(NOTA);

    // Card gravado antes de uma edição que mudou o trecho: a âncora é outra,
    // mas a posição dentro da nota ainda aponta para o lugar certo.
    expect(lineOf(lines, { anchorKey: "âncora-de-outra-versão", ordinal: 2 })).toBe(
      5,
    );
  });

  it("devolve null quando nem a âncora nem a posição existem", () => {
    const lines = cardLines(NOTA);

    expect(lineOf(lines, { anchorKey: "nada", ordinal: 99 })).toBeNull();
  });

  it("ignora lacuna dentro de cerca de código, como o parser", () => {
    const lines = cardLines(
      ["```python", "x = {{1}}", "```", "", "fim {{dois}}"].join("\n"),
    );

    expect(lines.byAnchor.size).toBe(1);
    expect(lineOf(lines, { anchorKey: "qualquer", ordinal: 0 })).toBe(5);
  });
});

describe("blocoDe", () => {
  it("associa a linha ao bloco que começa nela ou antes dela", () => {
    expect(blocoDe(7, [1, 3, 5, 12])).toBe(5);
  });

  it("associa a linha exata do início do bloco a esse bloco", () => {
    expect(blocoDe(3, [1, 3, 5])).toBe(3);
  });

  it("cai no primeiro bloco quando a linha vem antes de todos", () => {
    expect(blocoDe(1, [4, 8])).toBe(4);
  });

  it("não depende da ordem em que os blocos chegam", () => {
    expect(blocoDe(7, [12, 1, 5, 3])).toBe(5);
  });

  it("devolve null quando não há bloco nenhum", () => {
    expect(blocoDe(3, [])).toBeNull();
  });
});
