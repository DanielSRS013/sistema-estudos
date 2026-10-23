import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathMarkdown } from "@/shared/markdown";

import { cardsPorBloco } from "./by-block";

/**
 * O render de verdade: os mesmos plugins da leitura da nota, com o `aside` de
 * cards trocado por uma marca curta que o teste consegue ler. É o pipeline
 * inteiro — remark, KaTeX, o plugin — e não uma árvore montada à mão, porque o
 * que está sob teste é justamente onde o `aside` cai entre os blocos.
 */
function render(content: string, cards: { line: number | null }[]): string {
  return renderToStaticMarkup(
    createElement(MathMarkdown, {
      content,
      plugins: [cardsPorBloco(cards, content)],
      components: {
        aside: ({ node }: { node?: { properties?: Record<string, unknown> } }) =>
          createElement(
            "i",
            {},
            `[${String(node?.properties?.["data-cards"])}]`,
          ),
      },
    }),
  );
}

const NOTA = [
  "Primeiro parágrafo.", // 1
  "", // 2
  "## Um título", // 3
  "", // 4
  "Segundo parágrafo.", // 5
  "", // 6
  "Terceiro parágrafo.", // 7
].join("\n");

describe("cardsPorBloco", () => {
  it("põe os cards logo depois do bloco que os gerou", () => {
    const html = render(NOTA, [{ line: 1 }, { line: 5 }]);

    expect(html).toContain("<p>Primeiro parágrafo.</p><i>[0]</i>");
    expect(html).toContain("<p>Segundo parágrafo.</p><i>[1]</i>");
    // o terceiro bloco não gera card: nenhum aside depois dele
    expect(html).toMatch(/Terceiro parágrafo\.<\/p>$|Terceiro parágrafo\.<\/p>(?!<i>)/);
  });

  it("junta num aside só os cards do mesmo bloco", () => {
    const html = render(NOTA, [{ line: 5 }, { line: 5 }]);

    expect(html).toContain("<p>Segundo parágrafo.</p><i>[0 1]</i>");
  });

  it("associa ao bloco a linha que cai dentro dele, não só a de abertura", () => {
    // Parágrafo de duas linhas: um card nascido na segunda linha pertence ao
    // mesmo bloco.
    const html = render("Uma frase\nque continua.\n\nOutra.", [{ line: 2 }]);

    expect(html).toContain("que continua.</p><i>[0]</i>");
  });

  it("cai no primeiro bloco quando a linha vem antes de todos", () => {
    // O parser conta a linha crua; o render pode começar depois dela.
    const html = render("\n\nPrimeiro.", [{ line: 1 }]);

    expect(html).toContain("<p>Primeiro.</p><i>[0]</i>");
  });

  it("manda o card sem linha conhecida para o último bloco", () => {
    // Âncora de outra versão do texto: o card continua alcançável em vez de
    // desaparecer da tela.
    const html = render(NOTA, [{ line: null }]);

    expect(html).toContain("<p>Terceiro parágrafo.</p><i>[0]</i>");
  });

  it("não insere aside nenhum quando a nota não tem card", () => {
    expect(render(NOTA, [])).not.toContain("<i>");
  });

  it("não insere aside nenhum numa nota sem bloco", () => {
    expect(render("", [{ line: 1 }])).not.toContain("<i>");
  });

  it("põe o aside depois da continuação que troca de tipo de bloco", () => {
    // O A:: lê até a linha em branco (SPEC §3.2), então a lista faz parte da
    // resposta. Com o aside antes dela, a continuação cai na linha seguinte da
    // grade — fora do filete do bloco que gerou o card.
    const html = render(
      ["Q:: Uma pergunta?", "A:: A resposta começa:", "- um", "- dois"].join(
        "\n",
      ),
      [{ line: 1 }],
    );

    expect(html).toContain("</ul><i>[0]</i>");
    expect(html).not.toContain("<i>[0]</i><ul>");
  });

  it("põe o aside no parágrafo do par que não abre a unidade", () => {
    // O `Q::` na segunda linha parte a unidade em duas, mas a árvore do
    // Markdown tem um `<p>` só. Sem âncora própria, a segunda faixa caía no
    // último bloco da nota — o card aparecia ao lado de um parágrafo sem
    // relação, duas linhas da grade abaixo.
    const html = render(
      [
        "Contexto:",
        "Q:: Pergunta?",
        "A:: Resposta.",
        "",
        "Meio.",
        "",
        "Fim.",
      ].join("\n"),
      [{ line: 2 }],
    );

    expect(html).toContain("A:: Resposta.</p><i>[0]</i>");
    expect(html).not.toContain("Fim.</p><i>[0]</i>");
  });

  it("não quebra o bloco de código em dois", () => {
    const html = render("```py\nx = 1\n```\n\nDepois.", [{ line: 5 }]);

    expect(html).toContain("<p>Depois.</p><i>[0]</i>");
    expect(html).toContain("x = 1");
  });
});
