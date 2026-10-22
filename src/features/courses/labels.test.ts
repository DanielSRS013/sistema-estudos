import { describe, expect, it } from "vitest";

import {
  courseMetaLabel,
  lessonNotesLabel,
  moduleStudiedLabel,
  trackCountLabel,
} from "./labels";

describe("meta do curso", () => {
  it("conta módulos, aulas e estudadas", () => {
    expect(
      courseMetaLabel({ moduleCount: 5, lessonCount: 18, studiedCount: 14 }),
    ).toBe("5 módulos · 18 aulas · 14 estudadas");
  });

  it("diz nenhuma e todas em vez de 0 e do total", () => {
    expect(
      courseMetaLabel({ moduleCount: 4, lessonCount: 15, studiedCount: 0 }),
    ).toBe("4 módulos · 15 aulas · nenhuma estudada");
    expect(
      courseMetaLabel({ moduleCount: 7, lessonCount: 21, studiedCount: 21 }),
    ).toBe("7 módulos · 21 aulas · todas estudadas");
  });

  it("concorda no singular", () => {
    expect(
      courseMetaLabel({ moduleCount: 1, lessonCount: 1, studiedCount: 1 }),
    ).toBe("1 módulo · 1 aula · todas estudadas");
  });

  it("cala sobre estudadas quando o curso não tem aula", () => {
    // "0 aulas · nenhuma estudada" diz duas vezes a mesma coisa.
    expect(
      courseMetaLabel({ moduleCount: 0, lessonCount: 0, studiedCount: 0 }),
    ).toBe("0 módulos · 0 aulas");
  });
});

describe("contagem do módulo", () => {
  it("escreve quantas das aulas foram estudadas", () => {
    expect(moduleStudiedLabel({ lessonCount: 5, studiedCount: 2 })).toBe(
      "2 de 5 estudadas",
    );
  });

  it("diz que o módulo está vazio em vez de contar zero", () => {
    expect(moduleStudiedLabel({ lessonCount: 0, studiedCount: 0 })).toBe(
      "sem aulas",
    );
  });
});

describe("contagem de notas da aula", () => {
  it.each([
    [0, "sem notas"],
    [1, "1 nota"],
    [3, "3 notas"],
  ])("escreve %i como %s", (quantas, texto) => {
    expect(lessonNotesLabel(quantas)).toBe(texto);
  });
});

describe("contagem da especialização", () => {
  it("prefixa a especialização nomeada", () => {
    expect(trackCountLabel("Python para todos", 3)).toBe(
      "Especialização · 3 cursos",
    );
  });

  it("conta sozinho quando não há especialização", () => {
    expect(trackCountLabel(null, 1)).toBe("1 curso");
  });
});
