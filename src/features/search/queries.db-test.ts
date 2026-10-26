// Busca contra o tsvector do Postgres de verdade. As colunas `search_vector`
// são GERADAS pelo banco, e o stemmer português e o índice GIN só existem lá.
//
// Os testes de banco compartilham UM branch, e arquivos anteriores já deixaram
// notas e cards nele. `searchNotesAndCards` corta em 30 linhas por relevância
// (`LIMITE`), então uma busca por palavra comum poderia deixar a linha
// semeada fora do top 30 sem que a produção estivesse errada. Por isso:
//
//  - todo termo de busca carrega um marcador único por teste (`zqxmarcador…`,
//    sem acento e sem cara de palavra portuguesa, que atravessa
//    `immutable_unaccent` e o stemmer intacto);
//  - o marcador entra no texto semeado como token SEPARADO da palavra real, e a
//    consulta é "<palavra> <marcador>": `websearch_to_tsquery` trata o espaço
//    como AND, o que escopa o resultado às linhas semeadas e ainda exercita o
//    stemmer / o acento sobre a palavra real. Marcador grudado na palavra
//    seria um token só e não stemizaria;
//  - as asserções são por id (a `key` do hit), nunca por contagem global;
//  - cards semeados são arquivados no `afterAll` por UPDATE, nunca DELETE.

import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { cards } from "@/db/schema";
import { semearAula, semearCard, semearNota } from "@/shared/test-seed";

import { searchNotesAndCards } from "./queries";

const criados: string[] = [];

afterAll(async () => {
  if (criados.length === 0) return;
  await db
    .update(cards)
    .set({ archivedAt: new Date() })
    .where(inArray(cards.id, criados));
});

function marcador(): string {
  return `zqxmarcador${randomUUID().slice(0, 8)}`;
}

async function novaAula(): Promise<string> {
  const { lessonId } = await semearAula();
  return lessonId;
}

describe("searchNotesAndCards", () => {
  it("acha a nota pelo título e pelo conteúdo", async () => {
    const m = marcador();
    const lessonId = await novaAula();
    const peloTitulo = await semearNota(lessonId, {
      title: `Título ${m}`,
      content: "Corpo sem relação.",
    });
    const peloConteudo = await semearNota(lessonId, {
      title: "Outro título qualquer",
      content: `Um parágrafo que cita ${m} no meio.`,
    });

    const hits = await searchNotesAndCards(m);

    expect(hits.map((h) => h.key).sort()).toEqual(
      [peloTitulo.noteId, peloConteudo.noteId].sort(),
    );
    expect(hits.every((h) => h.origem === "note")).toBe(true);
  });

  it("acha sem acento o que foi escrito com acento", async () => {
    // Cobre o unaccent da COLUNA gerada e o config `portuguese`. NÃO detecta a
    // falta de unaccent na CONSULTA: o vetor guardado já é sem acento, então
    // "projecao" casa mesmo sem ele. Quem cobre a consulta é o teste seguinte.
    const m = marcador();
    const { noteId } = await semearNota(await novaAula(), {
      title: `Geometria ${m}`,
      content: "A projeção ortogonal sobre um subespaço.",
    });

    const hits = await searchNotesAndCards(`projecao ${m}`);

    expect(hits.map((h) => h.key)).toEqual([noteId]);
  });

  it("acha com acento o que foi escrito sem acento", async () => {
    // Cobre o unaccent da CONSULTA (queries.ts:55). NÃO REMOVER por parecer
    // duplicata do anterior: sem ele, a remoção de immutable_unaccent da
    // consulta ficaria sem cobertura.
    const m = marcador();
    const { noteId } = await semearNota(await novaAula(), {
      title: `Geometria ${m}`,
      content: "A projecao ortogonal sobre um subespaco.",
    });

    const hits = await searchNotesAndCards(`projeção ${m}`);

    expect(hits.map((h) => h.key)).toEqual([noteId]);
  });

  it("o stemmer português casa plural com singular", async () => {
    const m = marcador();
    const { noteId } = await semearNota(await novaAula(), {
      title: `Regras ${m}`,
      content: "As normas de conduta do curso.",
    });

    // Singular na consulta, plural guardado.
    const hits = await searchNotesAndCards(`norma ${m}`);

    expect(hits.map((h) => h.key)).toEqual([noteId]);
  });

  it("varre cards também, não só notas", async () => {
    const m = marcador();
    // A nota de origem NÃO contém o marcador: só o enunciado do card contém.
    const { noteId } = await semearNota(await novaAula(), {
      title: "Nota de origem sem marcador",
      content: "Conteúdo sem marcador.",
    });
    const { cardId } = await semearCard(noteId, {
      prompt: `Enunciado ${m}`,
      answer: "Resposta qualquer.",
    });
    criados.push(cardId);

    const hits = await searchNotesAndCards(m);

    expect(hits.map((h) => h.key)).toEqual([`card:${cardId}`]);
    expect(hits[0]?.origem).toBe("card");
    expect(hits[0]?.noteId).toBe(noteId);
  });

  it("termo vazio devolve lista vazia", async () => {
    // A produção faz `if (limpo === "") return []` antes de qualquer acesso ao
    // banco. Aqui só se afirma o `[]`. Que o banco NÃO foi consultado é um
    // negativo: prová-lo exigiria espiar ou mockar `db`, e a premissa desta
    // suíte é Postgres real, sem mock de driver. Fica declarado, não afirmado.
    expect(await searchNotesAndCards("")).toEqual([]);
  });

  it("termo só de espaços devolve lista vazia", async () => {
    // Prega o contrato "só espaços devolve []". NÃO detecta a remoção da guarda
    // nem do `trim()`: sem eles "   " iria ao banco, o websearch_to_tsquery
    // daria consulta vazia, nada casaria e o resultado seguiria sendo [].
    expect(await searchNotesAndCards("   ")).toEqual([]);
  });
});
