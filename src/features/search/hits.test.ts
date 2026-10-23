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
    plainTitle: "Projeção ortogonal",
    titleSemAcento: "Projecao ortogonal",
    snippet: "A projeção de v sobre u …",
    snippetSemAcento: "A projecao de v sobre u …",
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
    promptSemAcento: "A projecao de v sobre u vale […]",
    answer: "(v·u / u·u) u",
    answerSemAcento: "(v·u / u·u) u",
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
    // O handoff escreve "Nota · curso · aula" e "Card · estado · de <nota>":
    // numa lista misturada o primeiro token diz de onde o resultado veio.
    expect(hit.tipo).toBe("Nota");
    expect(hit.estado).toBeNull();
    expect(hit.noteId).toBe("n1");
    expect(hit.path).toBe("Álgebra · Espaços · Projeções");
  });

  it("leva o card com tipo, estado e a nota de origem", () => {
    const hit = primeiro(mesclarHits([], [card()], 30));

    expect(hit.origem).toBe("card");
    expect(hit.tipo).toBe("Card");
    expect(hit.estado).toBe("aprendendo");
    expect(hit.noteId).toBe("n9");
    expect(hit.noteTitle).toBe("Projeção ortogonal");
  });

  it("não leva marca de destaque no título da nota de origem", () => {
    // `title` vem do `ts_headline`, com os caracteres de controle dentro.
    // `noteTitle` é texto para ler, não para recortar: na nota ele vinha da
    // mesma string marcada, e quem o exibisse imprimiria os controles.
    const hit = primeiro(
      mesclarHits([nota({ title: `${ABRE}Projeção${FECHA} ortogonal` })], [], 30),
    );

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

describe("o recuo do destaque", () => {
  // O `ts_headline` sobre o texto cru não marca nada quando o termo veio sem
  // acento — mas também não marca nada quando o termo simplesmente não está
  // naquela coluna, que é o caso comum: o vetor cobre título e corpo, e o
  // casamento pode ser só num deles. Por isso o recuo não pode olhar só a
  // primeira string: ele só vale se a segunda ganhar alguma marca.
  it("recua quando o texto cru não marcou e o sem acento marcou", () => {
    const hit = primeiro(
      mesclarHits(
        [
          nota({
            title: "Limite fundamental trigonométrico",
            titleSemAcento: `Limite fundamental ${ABRE}trigonometrico${FECHA}`,
          }),
        ],
        [],
        30,
      ),
    );

    expect(hit.title).toEqual([
      { texto: "Limite fundamental ", destaque: false },
      { texto: "trigonometrico", destaque: true },
    ]);
  });

  it("não troca o texto acentuado quando ele já marcou", () => {
    const hit = primeiro(
      mesclarHits(
        [
          nota({
            title: `${ABRE}Projeção${FECHA} ortogonal`,
            titleSemAcento: `${ABRE}Projecao${FECHA} ortogonal`,
          }),
        ],
        [],
        30,
      ),
    );

    expect(hit.title).toEqual([
      { texto: "Projeção", destaque: true },
      { texto: " ortogonal", destaque: false },
    ]);
  });

  it("mantém o acento quando nenhum dos dois marcou", () => {
    // O caso comum: a nota casou pelo corpo, e o título não tem o termo. Antes
    // do conserto este título saía sem diacrítico na tela.
    const hit = primeiro(
      mesclarHits(
        [
          nota({
            title: "Projeção ortogonal",
            titleSemAcento: "Projecao ortogonal",
          }),
        ],
        [],
        30,
      ),
    );

    expect(hit.title).toEqual([{ texto: "Projeção ortogonal", destaque: false }]);
  });

  it("vale também para a resposta do card", () => {
    const hit = primeiro(
      mesclarHits(
        [],
        [
          card({
            answer: "a razão é um",
            answerSemAcento: `a ${ABRE}razao${FECHA} é um`,
          }),
        ],
        30,
      ),
    );

    expect(hit.snippet).toEqual([
      { texto: "a ", destaque: false },
      { texto: "razao", destaque: true },
      { texto: " é um", destaque: false },
    ]);
  });
});
