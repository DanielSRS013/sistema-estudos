import { describe, expect, it } from "vitest";

import { groupByTrack } from "./track";

const curso = (title: string, track: string | null) => ({ title, track });

describe("groupByTrack", () => {
  it("devolve nada para lista vazia", () => {
    expect(groupByTrack([])).toEqual([]);
  });

  it("junta os cursos da mesma especialização numa só seção", () => {
    const linhas = [
      curso("Linear Algebra", "Mathematics for ML"),
      curso("Calculus", "Mathematics for ML"),
    ];

    expect(groupByTrack(linhas)).toEqual([
      { track: "Mathematics for ML", courses: linhas },
    ]);
  });

  it("mantém a ordem de chegada dentro do grupo e entre os grupos", () => {
    const algebra = curso("Linear Algebra", "Mathematics for ML");
    const python = curso("Python", "Programação");
    const calculo = curso("Calculus", "Mathematics for ML");

    expect(groupByTrack([algebra, python, calculo])).toEqual([
      { track: "Mathematics for ML", courses: [algebra, calculo] },
      { track: "Programação", courses: [python] },
    ]);
  });

  it("deixa os cursos sem especialização por último, mesmo vindo primeiro", () => {
    const solto = curso("Avulso", null);
    const algebra = curso("Linear Algebra", "Mathematics for ML");

    expect(groupByTrack([solto, algebra])).toEqual([
      { track: "Mathematics for ML", courses: [algebra] },
      { track: null, courses: [solto] },
    ]);
  });

  it("não perde nenhum curso", () => {
    const linhas = [
      curso("a", null),
      curso("b", "X"),
      curso("c", null),
      curso("d", "Y"),
      curso("e", "X"),
    ];

    const total = groupByTrack(linhas).flatMap((grupo) => grupo.courses);

    expect(total).toHaveLength(linhas.length);
    expect(new Set(total)).toEqual(new Set(linhas));
  });
});
