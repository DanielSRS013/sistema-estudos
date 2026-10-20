import { describe, expect, it } from "vitest";

import { linkifyTags } from "./linkify";

describe("linkifyTags", () => {
  it("troca a tag por um link para a rota do conceito", () => {
    expect(linkifyTags("projeta em #norma aqui")).toBe(
      "projeta em [#norma](/tags/norma) aqui",
    );
  });

  it("linka pelo slug e mostra o nome como foi digitado", () => {
    expect(linkifyTags("em #Projeção-Vetorial.")).toBe(
      "em [#Projeção-Vetorial](/tags/projecao-vetorial).",
    );
  });

  it("troca todas as tags da nota", () => {
    expect(linkifyTags("#base e #eixo")).toBe(
      "[#base](/tags/base) e [#eixo](/tags/eixo)",
    );
  });

  it("devolve o texto intacto quando não há tag", () => {
    const markdown = "# Título\n\ncorpo com $x^2$ e `#` solto\n";

    expect(linkifyTags(markdown)).toBe(markdown);
  });

  it("não mexe no que está dentro de bloco de código", () => {
    const markdown = ["```python", "x = 1  # soma", "```", "", "fora: #real"].join("\n");

    expect(linkifyTags(markdown)).toBe(
      ["```python", "x = 1  # soma", "```", "", "fora: [#real](/tags/real)"].join("\n"),
    );
  });

  it("não mexe em código inline nem em LaTeX", () => {
    const markdown = "o `#comentario` e o $x^{#1}$ ficam como estão";

    expect(linkifyTags(markdown)).toBe(markdown);
  });

  it("deixa a cerquilha escapada literal", () => {
    const markdown = String.raw`o símbolo \#projecao fica literal`;

    expect(linkifyTags(markdown)).toBe(markdown);
  });

  it("não cria link dentro de link", () => {
    const markdown = "veja [a nota de #norma](/notes/1) ali";

    expect(linkifyTags(markdown)).toBe(markdown);
  });
});
