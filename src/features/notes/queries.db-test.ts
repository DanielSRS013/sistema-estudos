import { eq, inArray, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { courses, lessons, notes } from "@/db/schema";
import { semearAula, semearCard, semearNota } from "@/shared/test-seed";

import {
  getNoteById,
  lastCaptureLesson,
  listLessonOptions,
  listNotesForLesson,
  listRecentNotes,
} from "./queries";

async function fixarDatas(
  noteId: string,
  datas: { createdAt?: Date; updatedAt?: Date },
) {
  await db.update(notes).set(datas).where(eq(notes.id, noteId));
}

// O banco é compartilhado entre os arquivos e não é limpo, e `lastCaptureLesson`
// olha para o banco inteiro: sem isolar, o ramo `null` é inalcançável e o
// resultado depende do que os outros testes deixaram. Por isso arquiva
// (reversível, nada é apagado) os cursos ativos que não são os do teste, roda o
// corpo e restaura `archivedAt` para `null` no `finally`.
// SÓ É CORRETO porque os arquivos rodam em série (`--no-file-parallelism` no
// `test:db`): com paralelismo, outro arquivo veria os cursos arquivados.
async function comSoOsCursos<T>(
  manter: string[],
  corpo: () => Promise<T>,
): Promise<T> {
  const ativos = await db
    .select({ id: courses.id })
    .from(courses)
    .where(isNull(courses.archivedAt));
  const alvo = ativos.map((c) => c.id).filter((id) => !manter.includes(id));

  if (alvo.length > 0) {
    await db
      .update(courses)
      .set({ archivedAt: new Date() })
      .where(inArray(courses.id, alvo));
  }
  try {
    return await corpo();
  } finally {
    if (alvo.length > 0) {
      await db
        .update(courses)
        .set({ archivedAt: null })
        .where(inArray(courses.id, alvo));
    }
  }
}

describe("queries de notas", () => {
  it("listNotesForLesson ordena por data de criação, não por updatedAt", async () => {
    const { lessonId } = await semearAula();
    const a = await semearNota(lessonId, { title: "A" });
    const b = await semearNota(lessonId, { title: "B" });
    const c = await semearNota(lessonId, { title: "C" });

    // A ordenação por criação (e não por edição) é de propósito: a lista da
    // aula não pula quando uma nota é editada.
    // Criação: B, A, C — diferente da ordem de inserção (A, B, C).
    // updatedAt faz B, C, A (crescente) ou A, C, B (decrescente): nenhum dos
    // dois sentidos coincide com a ordem esperada.
    await fixarDatas(b.noteId, {
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-15T00:00:00Z"),
    });
    await fixarDatas(a.noteId, {
      createdAt: new Date("2024-01-02T00:00:00Z"),
      updatedAt: new Date("2024-03-01T00:00:00Z"),
    });
    await fixarDatas(c.noteId, {
      createdAt: new Date("2024-01-03T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    const lista = await listNotesForLesson(lessonId);

    expect(lista.map((n) => n.id)).toEqual([b.noteId, a.noteId, c.noteId]);
  });

  it("listNotesForLesson conta só os cards ativos e mantém a nota sem card", async () => {
    const { lessonId } = await semearAula();
    const comCards = await semearNota(lessonId, { title: "Com cards" });
    const semCards = await semearNota(lessonId, { title: "Sem cards" });
    await fixarDatas(comCards.noteId, {
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    await fixarDatas(semCards.noteId, {
      createdAt: new Date("2024-01-02T00:00:00Z"),
    });
    await semearCard(comCards.noteId);
    await semearCard(comCards.noteId);
    await semearCard(comCards.noteId, { archivedAt: new Date() });

    const lista = await listNotesForLesson(lessonId);

    expect(lista.map((n) => n.id)).toEqual([comCards.noteId, semCards.noteId]);
    expect(lista[0]?.meta).toMatch(/^2 cards/);
    expect(lista[1]?.meta).toMatch(/^Sem cards/);
  });

  it("listNotesForLesson não traz nota de outra aula", async () => {
    const { lessonId } = await semearAula();
    const outra = await semearAula();
    const minha = await semearNota(lessonId);
    const alheia = await semearNota(outra.lessonId);

    const ids = (await listNotesForLesson(lessonId)).map((n) => n.id);

    expect(ids).toContain(minha.noteId);
    expect(ids).not.toContain(alheia.noteId);
  });

  it("listRecentNotes respeita o limite", async () => {
    const { lessonId } = await semearAula({
      courseTitle: "Curso Recente",
      lessonTitle: "Aula Recente",
    });
    const antiga = await semearNota(lessonId, { title: "Antiga" });
    const meio = await semearNota(lessonId, { title: "Meio" });
    const nova = await semearNota(lessonId, { title: "Nova" });
    const ids = [antiga.noteId, meio.noteId, nova.noteId];
    try {
      // Datas no futuro distante: as três são as mais recentes do banco inteiro
      // enquanto o teste roda. Ordem de edição (nova, antiga, meio) diferente da
      // de criação.
      await fixarDatas(nova.noteId, {
        updatedAt: new Date("2500-03-01T00:00:00Z"),
      });
      await fixarDatas(antiga.noteId, {
        updatedAt: new Date("2500-02-01T00:00:00Z"),
      });
      await fixarDatas(meio.noteId, {
        updatedAt: new Date("2500-01-01T00:00:00Z"),
      });

      const lista = await listRecentNotes(2);

      expect(lista.map((n) => n.id)).toEqual([nova.noteId, antiga.noteId]);
      expect(lista[0]?.path).toBe("Curso Recente · Aula Recente");
    } finally {
      // `listRecentNotes` não filtra arquivado, então arquivar o curso não
      // tiraria as notas do topo. Recua as datas para o passado remoto: nada é
      // apagado, e testes de outros arquivos não as veem como as mais recentes.
      await db
        .update(notes)
        .set({ updatedAt: new Date("2000-01-01T00:00:00Z") })
        .where(inArray(notes.id, ids));
    }
  });

  it("lastCaptureLesson devolve a aula da nota mais recente", async () => {
    const a = await semearAula({ lessonTitle: "Aula A" });
    const b = await semearAula({ lessonTitle: "Aula B" });
    const notaA = await semearNota(a.lessonId);
    const notaB = await semearNota(b.lessonId);
    // A nota de A foi criada primeiro e editada por último.
    await fixarDatas(notaA.noteId, {
      updatedAt: new Date("2021-01-01T00:00:00Z"),
    });
    await fixarDatas(notaB.noteId, {
      updatedAt: new Date("2020-01-01T00:00:00Z"),
    });

    const resultado = await comSoOsCursos([a.courseId, b.courseId], () =>
      lastCaptureLesson(),
    );

    expect(resultado).toEqual({ id: a.lessonId, title: "Aula A" });
  });

  it("lastCaptureLesson ignora nota de aula arquivada", async () => {
    const a = await semearAula({ lessonTitle: "Aula viva" });
    const b = await semearAula({ lessonTitle: "Aula arquivada" });
    const notaA = await semearNota(a.lessonId);
    const notaB = await semearNota(b.lessonId);
    await fixarDatas(notaA.noteId, {
      updatedAt: new Date("2020-01-01T00:00:00Z"),
    });
    await fixarDatas(notaB.noteId, {
      updatedAt: new Date("2021-01-01T00:00:00Z"),
    });
    await db
      .update(lessons)
      .set({ archivedAt: new Date() })
      .where(eq(lessons.id, b.lessonId));

    const resultado = await comSoOsCursos([a.courseId, b.courseId], () =>
      lastCaptureLesson(),
    );

    expect(resultado).toEqual({ id: a.lessonId, title: "Aula viva" });
  });

  it("lastCaptureLesson devolve null sem nota nenhuma", async () => {
    // Sem curso ativo não há nota nem aula elegível: o ramo do `null`.
    const resultado = await comSoOsCursos([], () => lastCaptureLesson());

    expect(resultado).toBeNull();
  });

  it("getNoteById traz curso, aula e conteúdo", async () => {
    const { lessonId, moduleId, courseSlug } = await semearAula({
      courseTitle: "Cálculo",
      moduleTitle: "Limites",
      lessonTitle: "Definição",
    });
    const { noteId } = await semearNota(lessonId, {
      title: "Épsilon-delta",
      content: "Para todo $\\varepsilon > 0$...",
      kind: "summary",
    });

    const nota = await getNoteById(noteId);

    expect(nota).toMatchObject({
      id: noteId,
      title: "Épsilon-delta",
      kind: "summary",
      content: "Para todo $\\varepsilon > 0$...",
      lessonId,
      lesson: {
        id: lessonId,
        title: "Definição",
        module: {
          id: moduleId,
          title: "Limites",
          course: { slug: courseSlug, title: "Cálculo" },
        },
      },
    });
  });

  it("getNoteById devolve null para id inexistente", async () => {
    expect(await getNoteById(crypto.randomUUID())).toBeNull();
  });

  it("listLessonOptions omite aula arquivada", async () => {
    const { lessonId, moduleId } = await semearAula({
      courseTitle: "Opções",
      moduleTitle: "Mod",
      lessonTitle: "Viva",
    });
    const [morta] = await db
      .insert(lessons)
      .values({ moduleId, title: "Morta", archivedAt: new Date() })
      .returning({ id: lessons.id });
    if (!morta) throw new Error("a aula arquivada não foi criada");

    const opcoes = await listLessonOptions();

    expect(opcoes).toContainEqual({
      id: lessonId,
      path: "Opções · Mod · Viva",
    });
    expect(opcoes.map((o) => o.id)).not.toContain(morta.id);
  });

  it("listLessonOptions omite aula de curso arquivado", async () => {
    const { lessonId, courseId } = await semearAula();
    await db
      .update(courses)
      .set({ archivedAt: new Date() })
      .where(eq(courses.id, courseId));

    const opcoes = await listLessonOptions();

    expect(opcoes.map((o) => o.id)).not.toContain(lessonId);
  });
});
