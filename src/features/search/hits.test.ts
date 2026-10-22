import { describe, expect, it } from "vitest";

import { ABRE, FECHA } from "./highlight";
import {
  mesclarHits,
  type CardRow,
  type NoteRow,
  type SearchHit,
} from "./hits";

// `noUncheckedIndexedAccess` está ligado: indexar lista devolve `T | undefined`.
function primeiro(hits: readonly SearchHit[]): SearchHit {
  const [hit] = hits;
  if (hit === undefined) throw new Error("a mescla devolveu lista vazia");
  return hit;
}

function nota(over: Partial<NoteRow> = {}): NoteRow {
  return {
    id: "n1",
    title: "Projeção ortogonal",
    snippet: "A projeção de v sobre u …",
    kind: "lesson_note",
    updatedAt: new Date("2026-10-01T10:00:00Z"),
    rank: 0.5,
    courseTitle: "Álgebra",
    moduleTitle: "Espaços",
    lessonTitle: "Projeções",
    ...over,
  };
}

function card(over: Partial<CardRow> = {}): CardRow {
  return {
    id: "c1",
    noteId: "n9",
    prompt: "A projeção de v sobre u vale […]",
    answer: "(v·u / u·u) u",
    kind: "cloze",
    state: "learning",
    suspended: false,
    noteTitle: "Projeção ortogonal",
    updatedAt: new Date("2026-10-02T10:00:00Z"),
    rank: 0.9,
    courseTitle: "Álgebra",
    moduleTitle: "Espaços",
    lessonTitle: "Projeções",
    ...over,
  };
}

describe("mesclarHits", () => {
  it("leva a nota com o tipo em português e sem estado", () => {
    const hit = primeiro(mesclarHits([nota()], [], 30));

    expect(hit.origem).toBe("note");
    expect(hit.tipo).toBe("Anotação de aula");
    expect(hit.estado).toBeNull();
    expect(hit.noteId).toBe("n1");
    expect(hit.path).toBe("Álgebra · Espaços · Projeções");
  });

  it("leva o card com tipo, estado e a nota de origem", () => {
    const hit = primeiro(mesclarHits([], [card()], 30));

    expect(hit.origem).toBe("card");
    expect(hit.tipo).toBe("Lacuna");
    expect(hit.estado).toBe("aprendendo");
    expect(hit.noteId).toBe("n9");
    expect(hit.noteTitle).toBe("Projeção ortogonal");
  });

  it("diz suspenso no estado, não o estado do agendador", () => {
    const hit = primeiro(mesclarHits([], [card({ suspended: true, state: "review" })], 30));

    expect(hit.estado).toBe("suspenso");
  });

  it("recorta as marcas de controle em segmentos, sem HTML", () => {
    const hit = primeiro(mesclarHits(
      [nota({ title: `${ABRE}Projeção${FECHA} ortogonal` })],
      [],
      30,
    ));

    expect(hit.title).toEqual([
      { texto: "Projeção", destaque: true },
      { texto: " ortogonal", destaque: false },
    ]);
  });

  it("põe a face do card no título e a resposta no trecho", () => {
    const hit = primeiro(mesclarHits([], [card()], 30));

    expect(hit.title.map((s) => s.texto).join("")).toBe(
      "A projeção de v sobre u vale […]",
    );
    expect(hit.snippet.map((s) => s.texto).join("")).toBe("(v·u / u·u) u");
  });

  it("ordena notas e cards juntos por relevância, não por origem", () => {
    const hits = mesclarHits(
      [nota({ id: "n1", rank: 0.2 }), nota({ id: "n2", rank: 0.8 })],
      [card({ id: "c1", rank: 0.5 })],
      30,
    );

    expect(hits.map((h) => h.key)).toEqual(["n2", "card:c1", "n1"]);
  });

  it("desempata relevância igual pela edição mais recente", () => {
    const hits = mesclarHits(
      [
        nota({ id: "velha", rank: 0.5, updatedAt: new Date("2026-01-01") }),
        nota({ id: "nova", rank: 0.5, updatedAt: new Date("2026-06-01") }),
      ],
      [],
      30,
    );

    expect(hits.map((h) => h.key)).toEqual(["nova", "velha"]);
  });

  it("corta no limite depois de mesclar, para o card não ficar de fora", () => {
    const notas = Array.from({ length: 30 }, (_, i) =>
      nota({ id: `n${i}`, rank: 0.1 }),
    );
    const hits = mesclarHits(notas, [card({ rank: 0.9 })], 30);

    expect(hits).toHaveLength(30);
    expect(primeiro(hits).key).toBe("card:c1");
  });

  it("chaveia nota e card sem colidir quando os ids coincidem", () => {
    const hits = mesclarHits([nota({ id: "x" })], [card({ id: "x" })], 30);

    expect(new Set(hits.map((h) => h.key)).size).toBe(2);
  });
});
