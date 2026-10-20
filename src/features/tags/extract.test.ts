import { describe, expect, it } from "vitest";

import { extractTags, findTags } from "./extract";

describe("extractTags", () => {
  it("extrai a tag do meio do texto, com nome literal e slug normalizado", () => {
    expect(extractTags("A projeção escalar vive em #projecao-vetorial aqui.")).toEqual([
      { slug: "projecao-vetorial", name: "projecao-vetorial", line: 1 },
    ]);
  });

  it("extrai várias tags da mesma linha, na ordem do texto", () => {
    const tags = extractTags("conceitos: #produto-interno #projecao-vetorial");

    expect(tags.map((tag) => tag.slug)).toEqual([
      "produto-interno",
      "projecao-vetorial",
    ]);
  });

  it("guarda a linha de origem de cada tag", () => {
    const markdown = ["# Projeção", "", "corpo com #norma", "", "fim com #base"].join(
      "\n",
    );

    expect(extractTags(markdown)).toEqual([
      { slug: "norma", name: "norma", line: 3 },
      { slug: "base", name: "base", line: 5 },
    ]);
  });

  it("ignora tag dentro de bloco de código cercado", () => {
    const markdown = [
      "antes de #real",
      "",
      "```python",
      "# comentário",
      "x = 1  # soma #falsa",
      "```",
    ].join("\n");

    expect(extractTags(markdown).map((tag) => tag.slug)).toEqual(["real"]);
  });

  it("ignora tag dentro de código inline", () => {
    const markdown = "o `#` e o `# comentário #falso` do Python, mas #real conta";

    expect(extractTags(markdown).map((tag) => tag.slug)).toEqual(["real"]);
  });

  it("ignora tag dentro de LaTeX inline e em display", () => {
    expect(extractTags("vale $x^{#1}$ e nada mais").map((t) => t.slug)).toEqual([]);
    expect(extractTags("$$\def\f#1{#1}$$ e #real").map((t) => t.slug)).toEqual([
      "real",
    ]);
  });

  it("não vê tag em cerquilha escapada", () => {
    expect(extractTags(String.raw`o símbolo \#projecao fica literal`)).toEqual([]);
  });

  it("não vê tag em fragmento de URL", () => {
    expect(extractTags("veja https://exemplo.com/doc#secao-3 ali")).toEqual([]);
  });

  it("não confunde cabeçalho com tag", () => {
    expect(extractTags("# Projeção vetorial\n\n## Escalar e vetorial")).toEqual([]);
  });

  it("normaliza acento e caixa, preservando o nome digitado", () => {
    expect(extractTags("em #Projeção-Vetorial")).toEqual([
      { slug: "projecao-vetorial", name: "Projeção-Vetorial", line: 1 },
    ]);
  });

  it("devolve uma tag só quando o conceito se repete, com a primeira linha", () => {
    const markdown = ["#norma no começo", "", "e #Norma de novo"].join("\n");

    expect(extractTags(markdown)).toEqual([
      { slug: "norma", name: "norma", line: 1 },
    ]);
  });

  it("deixa a pontuação de borda fora da tag", () => {
    expect(extractTags("fecha em #norma, abre em (#base) e termina em #eixo.")).toEqual(
      [
        { slug: "norma", name: "norma", line: 1 },
        { slug: "base", name: "base", line: 1 },
        { slug: "eixo", name: "eixo", line: 1 },
      ],
    );
  });

  it("aceita tag em item de lista", () => {
    expect(extractTags("- revisar #autovalor").map((tag) => tag.slug)).toEqual([
      "autovalor",
    ]);
  });

  it("descarta cerquilha que não gera slug", () => {
    expect(extractTags("nada em #, #-- nem #.")).toEqual([]);
  });

  it("ignora tag dentro de rótulo de link, que o render não vai linkar", () => {
    expect(extractTags("veja [a nota de #norma](/notes/1) e #real")).toEqual([
      { slug: "real", name: "real", line: 1 },
    ]);
  });

  it("devolve lista vazia para nota vazia", () => {
    expect(extractTags("")).toEqual([]);
  });
});

describe("findTags", () => {
  it("devolve o recorte de cada tag no texto, para o render linkar", () => {
    const texto = "vive em #projecao-vetorial, com #Norma";

    expect(findTags(texto)).toEqual([
      { inicio: 8, fim: 26, name: "projecao-vetorial", slug: "projecao-vetorial" },
      { inicio: 32, fim: 38, name: "Norma", slug: "norma" },
    ]);
  });

  it("não recorta cerquilha escapada nem fragmento de URL", () => {
    expect(findTags(String.raw`\#literal e /doc#secao`)).toEqual([]);
  });
});
