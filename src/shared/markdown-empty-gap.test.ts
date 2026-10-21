import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathMarkdown } from "./markdown";
import { MARCA_VAZIA } from "./markdown-empty-gap";

/** O HTML que a pré-visualização do editor gera de fato. */
function render(content: string): string {
  return renderToStaticMarkup(
    createElement(MathMarkdown, { content, vazias: true }),
  );
}

describe("envolverLacunasVazias", () => {
  it("troca a marca por um `span` com o rótulo do handoff", () => {
    const html = render(`A projeção é ${MARCA_VAZIA}.`);

    expect(html).toContain('<span class="lacuna-vazia">{{}} lacuna vazia</span>');
    expect(html).not.toContain(MARCA_VAZIA);
  });

  it("envolve todas as marcas, não só a primeira", () => {
    // Uma nota pode ter várias lacunas vazias ao mesmo tempo — basta digitar
    // duas antes de escrever as respostas.
    const html = render(`${MARCA_VAZIA} e ${MARCA_VAZIA}`);

    expect(html.match(/class="lacuna-vazia"/g)).toHaveLength(2);
  });

  it("alcança a marca dentro de ênfase e de título", () => {
    expect(render(`*antes ${MARCA_VAZIA} depois*`)).toContain(
      'class="lacuna-vazia"',
    );
    expect(render(`# Título ${MARCA_VAZIA}`)).toContain('class="lacuna-vazia"');
  });

  it("deixa o texto sem marca exatamente como estava", () => {
    const html = render("Um parágrafo comum.");

    expect(html).not.toContain("lacuna-vazia");
    expect(html).toContain("Um parágrafo comum.");
  });

  it("não envolve nada quando a pré-visualização não pede", () => {
    // O corpo da nota em leitura e a face do card passam pelo mesmo
    // componente: a marca nunca chega lá, mas o plugin também não entra.
    const html = renderToStaticMarkup(
      createElement(MathMarkdown, { content: `A projeção é ${MARCA_VAZIA}.` }),
    );

    expect(html).not.toContain("lacuna-vazia");
  });
});
