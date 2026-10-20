import { describe, expect, it } from "vitest";

import { ABRE, FECHA, splitHighlight } from "./highlight";

const marcar = (texto: string) => `${ABRE}${texto}${FECHA}`;

describe("splitHighlight", () => {
  it("devolve um segmento só quando não há marca", () => {
    expect(splitHighlight("projeção escalar")).toEqual([
      { texto: "projeção escalar", destaque: false },
    ]);
  });

  it("separa o trecho marcado do texto ao redor", () => {
    expect(splitHighlight(`a ${marcar("projeção")} escalar`)).toEqual([
      { texto: "a ", destaque: false },
      { texto: "projeção", destaque: true },
      { texto: " escalar", destaque: false },
    ]);
  });

  it("aceita marca no começo e no fim do trecho", () => {
    expect(splitHighlight(`${marcar("norma")} de ${marcar("vetor")}`)).toEqual([
      { texto: "norma", destaque: true },
      { texto: " de ", destaque: false },
      { texto: "vetor", destaque: true },
    ]);
  });

  it("aceita marcas vizinhas sem texto entre elas", () => {
    expect(splitHighlight(`${marcar("pro")}${marcar("jeção")}`)).toEqual([
      { texto: "pro", destaque: true },
      { texto: "jeção", destaque: true },
    ]);
  });

  it("trata abertura sem fechamento como texto comum", () => {
    expect(splitHighlight(`a ${ABRE}projeção escalar`)).toEqual([
      { texto: "a projeção escalar", destaque: false },
    ]);
  });

  it("descarta destaque vazio", () => {
    expect(splitHighlight(`a ${marcar("")}norma`)).toEqual([
      { texto: "a ", destaque: false },
      { texto: "norma", destaque: false },
    ]);
  });

  it("devolve lista vazia para trecho vazio", () => {
    expect(splitHighlight("")).toEqual([]);
  });
});
