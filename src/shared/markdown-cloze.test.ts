import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathMarkdown } from "./markdown";
import { LACUNA, marcarLacuna } from "./markdown-cloze";

/** O HTML que a face do card gera de fato, com KaTeX e tudo. */
function render(content: string, lacuna?: "oculta" | "revelada"): string {
  return renderToStaticMarkup(
    createElement(MathMarkdown, {
      content,
      className: "card-face",
      ...(lacuna === undefined ? {} : { lacuna }),
    }),
  );
}

describe("marcarLacuna", () => {
  it("cerca a lacuna da vez", () => {
    const marcado = marcarLacuna(`A projeção é ${LACUNA}.`);

    // No estado pergunta a marca continua sendo o conteúdo da lacuna: o que
    // entra é o par de controle em volta dela.
    expect(marcado).toBe(`A projeção é \uE000${LACUNA}\uE001.`);
  });

  it("põe a resposta no lugar da lacuna", () => {
    expect(marcarLacuna(`A projeção é ${LACUNA}.`, "$u$")).toContain("$u$");
  });

  it("devolve intacto o texto sem lacuna", () => {
    const pergunta = "O que é uma projeção?";

    expect(marcarLacuna(pergunta)).toBe(pergunta);
    expect(marcarLacuna(pergunta, "qualquer coisa")).toBe(pergunta);
  });

  it("marca só a primeira lacuna", () => {
    // A frente de um cloze esconde uma lacuna por card: as outras já vêm
    // resolvidas do parser, e marcar duas abriria dois filetes na mesma frase.
    const marcado = marcarLacuna(`${LACUNA} e ${LACUNA}`);

    expect(marcado).toContain(LACUNA);
    expect(marcado.indexOf("\uE000")).toBe(marcado.lastIndexOf("\uE000"));
  });
});

describe("envolverLacuna no render da face", () => {
  it("dá à lacuna oculta um elemento que o CSS alcança", () => {
    const html = render(marcarLacuna(`A projeção é ${LACUNA}.`), "oculta");

    expect(html).toContain('<span class="cloze-oculta">[…]</span>');
  });

  it("revela a resposta in-loco, com o LaTeX dela renderizado", () => {
    const html = render(
      marcarLacuna(`A projeção é ${LACUNA}.`, "$\\vec u$"),
      "revelada",
    );

    expect(html).toContain('<span class="cloze-revelada">');
    expect(html).toContain("katex");
    expect(html).not.toContain(LACUNA);
  });

  it("não deixa caractere de controle na tela", () => {
    const html = render(marcarLacuna(`A projeção é ${LACUNA}.`), "oculta");

    expect(html).not.toMatch(/[\uE000\uE001]/u);
  });

  it("não envolve nada quando o card é pergunta e resposta", () => {
    const html = render(marcarLacuna("O que é uma projeção?"), "oculta");

    expect(html).not.toContain("cloze-");
  });

  it("mantém a face sem marca quando ninguém pede lacuna", () => {
    const html = render(`A projeção é ${LACUNA}.`);

    expect(html).toContain(LACUNA);
    expect(html).not.toContain("cloze-");
  });
});
