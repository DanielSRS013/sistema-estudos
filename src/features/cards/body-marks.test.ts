import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathMarkdown } from "@/shared/markdown";
import { marcasDeCard } from "@/shared/markdown-card-marks";

import { cardsPorBloco } from "./by-block";
import { marcarCardsNoCorpo } from "./body-marks";
import { parse, posicoesDeCards } from "./parser";

/** O corpo da nota como a leitura o renderiza, marcas e plugin incluídos. */
function corpo(markdown: string): string {
  return renderToStaticMarkup(
    createElement(MathMarkdown, {
      content: marcarCardsNoCorpo(markdown),
      marcarCards: true,
    }),
  );
}

describe("a lacuna no corpo da nota", () => {
  it("sublinha o trecho e numera o card ao lado", () => {
    const html = corpo("A escalar de s sobre r é {{(r · s) / |r|}}.");

    expect(html).toContain(
      '<span class="note-cloze">(r · s) / |r|</span><a class="note-ref" href="#c1">1</a>',
    );
  });

  it("numera as lacunas na ordem em que o parser as lê", () => {
    const html = corpo(
      ["Primeira {{uma}}.", "", "Segunda {{duas}} e {{três}}."].join("\n"),
    );

    expect(html).toContain('href="#c1">1</a>');
    expect(html).toContain('href="#c2">2</a>');
    expect(html).toContain('href="#c3">3</a>');
  });

  it("mostra a resposta e não a dica", () => {
    const html = corpo("O determinante é {{zero::pense no volume}}.");

    expect(html).toContain('<span class="note-cloze">zero</span>');
    expect(html).not.toContain("pense no volume");
  });

  it("atravessa o LaTeX da resposta sem partir o sublinhado", () => {
    const html = corpo("A escalar é {{$\frac{a}{b}$ do total}}.");

    expect(html).toContain('<span class="note-cloze">');
    expect(html).toContain("katex");
    expect(html).toContain('href="#c1">1</a>');
  });

  it("não marca lacuna dentro de cerca de código", () => {
    const html = corpo(["```md", "{{exemplo}}", "```"].join("\n"));

    expect(html).toContain("{{exemplo}}");
    expect(html).not.toContain("note-cloze");
  });

  it("não marca lacuna vazia, que não gera card", () => {
    const html = corpo("Sem resposta {{}}.");

    expect(html).toContain("{{}}");
    expect(html).not.toContain("note-cloze");
  });

  it("não deixa marca de controle vazar para a tela", () => {
    const html = corpo("Uma {{lacuna}} só.");

    for (const marca of Object.values(marcasDeCard)) {
      expect(html).not.toContain(marca);
    }
  });
});

describe("o bloco Pergunta/Resposta no corpo da nota", () => {
  const NOTA = ["Q:: Por que é zero?", "A:: Porque são ortogonais."].join("\n");

  it("vira bloco com os dois rótulos, e não texto literal", () => {
    const html = corpo(NOTA);

    expect(html).toContain('<div class="note-qa">');
    expect(html).toContain('<span class="note-qa-rotulo">Pergunta');
    expect(html).toContain('<span class="note-qa-rotulo">Resposta</span>');
    expect(html).toContain("Por que é zero?");
    expect(html).toContain("Porque são ortogonais.");
    expect(html).not.toContain("Q::");
    expect(html).not.toContain("A::");
  });

  it("põe o número do card no rótulo da pergunta", () => {
    expect(corpo(NOTA)).toContain('<a class="note-ref" href="#c1">1</a>');
  });

  it("conta o par depois das lacunas do mesmo bloco", () => {
    const html = corpo(
      ["Uma {{lacuna}}.", "Q:: E depois?", "A:: Isto."].join("\n"),
    );

    expect(html).toContain('href="#c1">1</a>');
    expect(html).toContain('<span class="note-qa-rotulo">Pergunta<a class="note-ref" href="#c2">2</a>');
  });

  it("guarda a resposta de várias linhas inteira", () => {
    const html = corpo(
      ["Q:: Pergunta?", "A:: Primeira linha", "e a continuação."].join("\n"),
    );

    expect(html).toContain("Primeira linha");
    expect(html).toContain("e a continuação.");
  });

  it("deixa como texto o Q:: sem resposta, que não gera card", () => {
    const html = corpo("Q:: Pergunta sozinha?");

    expect(html).toContain("Q:: Pergunta sozinha?");
    expect(html).not.toContain("note-qa");
  });
});

describe("o bloco partido e a linha da grade", () => {
  // O par `Q::` não precisa de linha em branco antes: ele e as lacunas que o
  // antecedem são um bloco só para o Markdown, e o bloco Pergunta/Resposta
  // nasce de uma partição do parágrafo. Se a metade nova não carregar a linha
  // de onde veio, os cards do par caem na linha da grade do trecho anterior —
  // que foi o que a tela mostrou.
  const NOTA = ["O limite é {{um}}.", "Q:: E em graus?", "A:: Muda."].join("\n");

  function comCards(markdown: string): string {
    return renderToStaticMarkup(
      createElement(MathMarkdown, {
        content: marcarCardsNoCorpo(markdown),
        marcarCards: true,
        plugins: [cardsPorBloco([{ line: 1 }, { line: 2 }])],
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

  it("deixa cada card na linha do seu trecho", () => {
    const html = comCards(NOTA);

    expect(html).toContain("</p><i>[0]</i>");
    expect(html).toContain("</div><i>[1]</i>");
    expect(html).not.toContain("<i>[0 1]</i>");
  });
});

describe("as marcas e o parser contam a mesma coisa", () => {
  // A numeração do corpo é o ordinal do card, e a âncora `#cN` precisa existir
  // na margem. Se as duas varreduras divergirem, o sobrescrito aponta para o
  // card errado — e nada na tela acusa.
  const NOTAS = [
    "Uma {{a}} e outra {{b}}.\n\nQ:: Pergunta?\nA:: Resposta.",
    "```py\n{{nao}}\n```\n\nDepois {{sim}}.",
    "Vazia {{}} e válida {{c}}.",
    "Q:: Só pergunta?\n\nDepois {{d}}.",
    "Com dica {{x::dica}}.\n\nQ:: P?\nA:: R.\n\nFinal {{y}}.",
    "Nada aqui.",
  ];

  // O plugin que põe o card na linha da grade (`by-block.ts`) acha o bloco pela
  // linha que o hast carrega. Se marcar o corpo mexesse na contagem de linhas,
  // o card apareceria ao lado do trecho errado.
  it.each(NOTAS)("não mexe na contagem de linhas de %j", (nota) => {
    expect(marcarCardsNoCorpo(nota).split("\n")).toHaveLength(
      nota.split("\n").length,
    );
  });

  it.each(NOTAS)("casa ordinal e tipo em %j", (nota) => {
    const posicoes = posicoesDeCards(nota);
    const { cards } = parse(nota);

    expect(posicoes.map((p) => p.ordinal)).toEqual(
      cards.map((card) => card.ordinal),
    );
    expect(posicoes.map((p) => p.kind)).toEqual(cards.map((card) => card.kind));
  });
});
