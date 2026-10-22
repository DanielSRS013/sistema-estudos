import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { realcarCodigo } from "@/features/notes/code";

import { MathMarkdown } from "./markdown";
import { realcarBlocos } from "./markdown-code";

function render(markdown: string): string {
  return renderToStaticMarkup(
    createElement(MathMarkdown, {
      content: markdown,
      plugins: [realcarBlocos(realcarCodigo)],
    }),
  );
}

const PY = ["```python", "# média", 'x = media([1, 2])', "```"].join("\n");

describe("realce no bloco de código", () => {
  it("envolve cada classe num span com a classe do realce", () => {
    const html = render(PY);

    expect(html).toContain('<span class="cod-comentario"># média</span>');
    expect(html).toContain('<span class="cod-numero">1</span>');
  });

  it("não perde nenhum caractere do código", () => {
    const html = render(PY);

    // o texto do bloco, sem as tags, é o código como foi escrito
    const miolo = html.slice(html.indexOf("<code"), html.indexOf("</code>"));

    expect(miolo.replace(/<[^>]*>/g, "")).toBe("# média\nx = media([1, 2])\n");
  });

  it("não mexe em código inline, que o handoff deixa como está", () => {
    const html = render("Use `return x` aqui.");

    expect(html).toContain("<code>return x</code>");
    expect(html).not.toContain("cod-chave");
  });

  it("não mexe no texto do parágrafo", () => {
    const html = render("Não use # nem 42 aqui.");

    expect(html).not.toContain("cod-comentario");
    expect(html).not.toContain("cod-numero");
  });

  it("realça o bloco sem linguagem declarada", () => {
    const html = render(["```", "def f():", "```"].join("\n"));

    expect(html).toContain('<span class="cod-chave">def</span>');
  });
});
