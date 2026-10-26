import { describe, expect, it } from "vitest";

import type { No, Raiz } from "./markdown-cloze";
import { envolverCards, marcasDeCard as M } from "./markdown-card-marks";

const texto = (value: string): No => ({ type: "text", value });

function el(
  tagName: string,
  children: No[] = [],
  properties: Record<string, unknown> = {},
  position?: No["position"],
): No {
  return {
    type: "element",
    tagName,
    properties,
    children,
    ...(position === undefined ? {} : { position }),
  };
}

const raiz = (...children: No[]): Raiz => ({ type: "root", children });

function aplicar(arvore: Raiz): Raiz {
  envolverCards()()(arvore);

  return arvore;
}

const classe = (no: No | undefined): unknown =>
  (no?.properties?.className as string[] | undefined)?.[0];

/** O que sobrou de marca em qualquer texto ou atributo da árvore. */
function temMarca(no: No): boolean {
  const marcas = Object.values(M);
  const dentro = (s: string): boolean => marcas.some((m) => s.includes(m));

  return (
    dentro(no.value ?? "") ||
    Object.values(no.properties ?? {}).some(
      (v) => typeof v === "string" && dentro(v),
    ) ||
    (no.children ?? []).some(temMarca)
  );
}

describe("envolverCards: a lacuna", () => {
  it("vira span.note-cloze seguido de a.note-ref com href #c1", () => {
    const p = el("p", [texto(`antes ${M.lacuna}resposta${M.fecha}1${M.numero} depois`)]);
    const [filho] = aplicar(raiz(p)).children;

    expect(filho?.children).toEqual([
      texto("antes "),
      el("span", [texto("resposta")], { className: ["note-cloze"] }),
      el("a", [texto("1")], { className: ["note-ref"], href: "#c1" }),
      texto(" depois"),
    ]);
  });

  it("envolve inteiro o trecho que atravessa irmãos", () => {
    const formula = el("span", [texto("a/b")], { className: ["katex"] });
    const p = el("p", [
      texto(`x ${M.lacuna}um `),
      formula,
      texto(` dois${M.fecha}2${M.numero} y`),
    ]);
    const filhos = aplicar(raiz(p)).children[0]?.children;

    expect(filhos).toEqual([
      texto("x "),
      el("span", [texto("um "), formula, texto(" dois")], {
        className: ["note-cloze"],
      }),
      el("a", [texto("2")], { className: ["note-ref"], href: "#c2" }),
      texto(" y"),
    ]);
  });

  it("troca os dois pares do mesmo parágrafo (o laço de percorrerLacunas)", () => {
    const p = el("p", [
      texto(
        `${M.lacuna}a${M.fecha}1${M.numero} e ${M.lacuna}b${M.fecha}2${M.numero}`,
      ),
    ]);
    const filhos = aplicar(raiz(p)).children[0]?.children ?? [];

    expect(filhos.filter((f) => classe(f) === "note-cloze")).toHaveLength(2);
    expect(filhos.map((f) => f.properties?.href).filter(Boolean)).toEqual([
      "#c1",
      "#c2",
    ]);
    expect(temMarca(raiz(...filhos))).toBe(false);
  });
});

describe("envolverCards: o par Pergunta/Resposta", () => {
  const par = (): No =>
    // Como o remark entrega `Q::` e `A::` em linhas vizinhas: uma quebra leve
    // (um "\n") dentro do mesmo nó de texto, não um elemento `br`.
    el("p", [
      texto(`${M.pergunta}3${M.numero}Qual a capital?\n${M.resposta}Brasília`),
    ]);

  it("vira div.note-qa com quatro células e os rótulos", () => {
    const [bloco] = aplicar(raiz(par())).children;

    expect(bloco?.tagName).toBe("div");
    expect(classe(bloco)).toBe("note-qa");
    expect(bloco?.children).toHaveLength(4);

    const [rotP, perg, rotR, resp] = bloco?.children ?? [];

    expect(rotP?.children?.[0]).toEqual(texto("Pergunta"));
    expect(rotP?.children?.[1]?.properties?.href).toBe("#c3");
    expect(perg?.children).toEqual([texto("Qual a capital?\n")]);
    expect(rotR?.children).toEqual([texto("Resposta")]);
    expect(resp?.children).toEqual([texto("Brasília")]);
  });

  it("herda a linha do Q::, adiantada pelas quebras do que vinha antes", () => {
    const p = el(
      "p",
      [
        texto(
          `intro\nsegunda linha\n${M.pergunta}1${M.numero}Q?\n${M.resposta}R`,
        ),
      ],
      {},
      { start: { line: 10 } },
    );
    const [antes, bloco] = aplicar(raiz(p)).children;

    expect(antes?.tagName).toBe("p");
    expect(antes?.children).toEqual([texto("intro\nsegunda linha\n")]);
    expect(classe(bloco)).toBe("note-qa");
    expect(bloco?.position).toEqual({ start: { line: 12 } });
  });
});

describe("envolverCards: marca sobrando", () => {
  it("é limpa do texto e dos atributos, inclusive do title", () => {
    const erro = el("span", [texto(`x = ${M.lacuna}2`)], {
      className: ["katex-error"],
      title: `ParseError ${M.lacuna}2${M.fecha}`,
    });
    const arvore = aplicar(
      raiz(el("p", [texto(`solta ${M.numero} e ${M.resposta}`), erro])),
    );

    expect(temMarca(arvore)).toBe(false);
    expect(erro.properties?.title).toBe("ParseError 2");
    expect(erro.children).toEqual([texto("x = 2")]);
    expect(erro.properties?.className).toEqual(["katex-error"]);
  });
});
