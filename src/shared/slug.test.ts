import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(slugify("Álgebra Linear")).toBe("algebra-linear");
    expect(slugify("Introdução à Projeção")).toBe("introducao-a-projecao");
  });

  it("colapsa pontuação e espaços em um único hífen", () => {
    expect(slugify("Cálculo  —  parte 2!")).toBe("calculo-parte-2");
  });

  it("não deixa hífen nas bordas", () => {
    expect(slugify("  /python/  ")).toBe("python");
  });

  it("devolve string vazia quando nada sobra", () => {
    expect(slugify("±±±")).toBe("");
  });
});
