import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { neighborFor, swapPositions, type Positioned } from "./reorder";

const items = [
  { id: "a", position: 0 },
  { id: "b", position: 1 },
  { id: "c", position: 2 },
];

describe("neighborFor", () => {
  it("acha o vizinho de cima", () => {
    expect(neighborFor(items, "b", "up")?.id).toBe("a");
  });

  it("acha o vizinho de baixo", () => {
    expect(neighborFor(items, "b", "down")?.id).toBe("c");
  });

  it("devolve null nas pontas", () => {
    expect(neighborFor(items, "a", "up")).toBeNull();
    expect(neighborFor(items, "c", "down")).toBeNull();
  });

  it("devolve null para id de fora da lista", () => {
    expect(neighborFor(items, "z", "up")).toBeNull();
  });

  it("ordena por position antes de olhar o vizinho", () => {
    const baguncado = [items[2], items[0], items[1]].filter(
      (item): item is (typeof items)[number] => item !== undefined,
    );
    expect(neighborFor(baguncado, "c", "up")?.id).toBe("b");
  });

  it("tolera posições com buracos", () => {
    const esparso = [
      { id: "a", position: 0 },
      { id: "b", position: 7 },
      { id: "c", position: 90 },
    ];
    expect(neighborFor(esparso, "c", "up")?.id).toBe("b");
  });
});

describe("swapPositions", () => {
  // Renderiza a expressão sem banco algum: o dialeto só monta texto e params.
  function render(current: Positioned, neighbor: Positioned) {
    return new PgDialect().sqlToQuery(swapPositions(current, neighbor));
  }

  it("troca as duas posições numa única expressão", () => {
    const { params } = render(
      { id: "aula-1", position: 2 },
      { id: "aula-2", position: 3 },
    );
    expect(params).toEqual(["aula-1", 3, 2]);
  });

  it("declara o tipo das posições como integer", () => {
    // Sem o cast o Postgres trata o parâmetro dentro do `case` como text e
    // recusa o UPDATE: column "position" is of type integer but expression is
    // of type text. A coluna de destino não tipa o parâmetro aqui.
    const { sql: texto } = render(
      { id: "aula-1", position: 2 },
      { id: "aula-2", position: 3 },
    );
    expect(texto).toBe(
      "case when id = $1 then $2::integer else $3::integer end",
    );
  });
});
