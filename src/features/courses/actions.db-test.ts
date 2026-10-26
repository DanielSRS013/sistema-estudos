import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { courses, lessons, modules } from "@/db/schema";
import { revalidacoes } from "@/db/test-support/next-cache";
import type { ActionState } from "@/shared/action-state";
import { semearAula } from "@/shared/test-seed";

import {
  createCourse,
  createLesson,
  createModule,
  moveCourse,
  moveLesson,
  moveModule,
  renameCourse,
  renameLesson,
  renameModule,
  setCourseArchived,
  setLessonArchived,
  setLessonStudied,
  setModuleArchived,
} from "./actions";

const inicial: ActionState = { ok: true };

function form(campos: Record<string, string>): FormData {
  const data = new FormData();
  for (const [chave, valor] of Object.entries(campos)) data.set(chave, valor);
  return data;
}

async function cursoPorId(id: string) {
  return db.query.courses.findFirst({ where: eq(courses.id, id) });
}
async function moduloPorId(id: string) {
  return db.query.modules.findFirst({ where: eq(modules.id, id) });
}
async function aulaPorId(id: string) {
  return db.query.lessons.findFirst({ where: eq(lessons.id, id) });
}

describe("actions de cursos", () => {
  it("createCourse sem título devolve a mensagem do schema", async () => {
    const antes = await db.select({ id: courses.id }).from(courses);

    const resultado = await createCourse(inicial, new FormData());

    expect(resultado).toEqual({ ok: false, message: "Informe um título." });
    const depois = await db.select({ id: courses.id }).from(courses);
    expect(depois).toHaveLength(antes.length);
    expect(revalidacoes).toHaveLength(0);
  });

  it("createCourse grava o curso e revalida o layout", async () => {
    const resultado = await createCourse(
      inicial,
      form({ title: "  Física Quântica  ", track: "Ciências" }),
    );

    expect(resultado).toEqual({ ok: true });
    const linha = await db.query.courses.findFirst({
      where: eq(courses.slug, "fisica-quantica"),
    });
    expect(linha?.title).toBe("Física Quântica");
    expect(linha?.track).toBe("Ciências");
    expect(linha?.provider).toBeNull();
    expect(revalidacoes).toContainEqual({ path: "/", type: "layout" });
  });

  it("createCourse dá slug único quando o título repete", async () => {
    // Sufixo único no título: o slug-base nasce livre por construção, e o
    // filtro por título não vê curso de outro arquivo.
    const s = randomUUID().slice(0, 8);
    const titulo = `Álgebra Linear ${s}`;
    await createCourse(inicial, form({ title: titulo }));
    await createCourse(inicial, form({ title: titulo }));

    const linhas = await db.query.courses.findMany({
      where: eq(courses.title, titulo),
    });

    expect(linhas).toHaveLength(2);
    expect(linhas.map((l) => l.slug).sort()).toEqual([
      `algebra-linear-${s}`,
      `algebra-linear-${s}-2`,
    ]);
  });

  it("renameCourse muda o título e mantém o slug", async () => {
    const { courseId, courseSlug } = await semearAula();
    const irmao = await semearAula({ courseTitle: "Irmão intacto" });

    const resultado = await renameCourse(
      inicial,
      form({ id: courseId, title: "Novo nome" }),
    );

    expect(resultado).toEqual({ ok: true });
    const curso = await cursoPorId(courseId);
    expect(curso?.title).toBe("Novo nome");
    expect(curso?.slug).toBe(courseSlug);
    // Sem WHERE, o UPDATE renomearia todos os cursos.
    expect((await cursoPorId(irmao.courseId))?.title).toBe("Irmão intacto");
  });

  it("setCourseArchived preenche e limpa archivedAt", async () => {
    const { courseId } = await semearAula();
    const irmao = await semearAula();

    await setCourseArchived(inicial, form({ id: courseId, archived: "true" }));
    expect((await cursoPorId(courseId))?.archivedAt).toBeInstanceOf(Date);
    // Sem WHERE, o UPDATE arquivaria todos os cursos.
    expect((await cursoPorId(irmao.courseId))?.archivedAt).toBeNull();

    await setCourseArchived(inicial, form({ id: courseId, archived: "false" }));
    expect((await cursoPorId(courseId))?.archivedAt).toBeNull();
  });

  it("moveCourse troca as posições de dois cursos", async () => {
    const a = await semearAula();
    const b = await semearAula();
    // Posições altas e exclusivas deste teste: a e b ficam vizinhos.
    await db
      .update(courses)
      .set({ position: 7000 })
      .where(eq(courses.id, a.courseId));
    await db
      .update(courses)
      .set({ position: 7001 })
      .where(eq(courses.id, b.courseId));

    const resultado = await moveCourse(
      inicial,
      form({ id: a.courseId, direction: "down" }),
    );

    expect(resultado).toEqual({ ok: true });
    expect((await cursoPorId(a.courseId))?.position).toBe(7001);
    expect((await cursoPorId(b.courseId))?.position).toBe(7000);
  });

  it("createModule grava o módulo no fim da lista do curso", async () => {
    const { courseId } = await semearAula();

    const resultado = await createModule(
      inicial,
      form({ courseId, title: "Segundo módulo" }),
    );

    expect(resultado).toEqual({ ok: true });
    const linhas = await db.query.modules.findMany({
      where: eq(modules.courseId, courseId),
    });
    const novo = linhas.find((m) => m.title === "Segundo módulo");
    expect(linhas).toHaveLength(2);
    expect(novo?.position).toBe(1);
    expect(revalidacoes).toContainEqual({ path: "/", type: "layout" });
  });

  it("createModule com curso inexistente devolve a frase única de falha", async () => {
    // Viola a chave estrangeira. O console.error que aparece na saída é
    // intencional: o helper run registra o erro e devolve a frase única.
    const resultado = await createModule(
      inicial,
      form({
        courseId: "00000000-0000-4000-8000-000000000000",
        title: "Órfão",
      }),
    );

    expect(resultado).toEqual({
      ok: false,
      message:
        "Não foi possível salvar agora. Confira a conexão e tente de novo.",
    });
    expect(revalidacoes).toHaveLength(0);
  });

  it("renameModule muda o título do módulo", async () => {
    const { moduleId } = await semearAula();
    const irmao = await semearAula({ moduleTitle: "Irmão intacto" });

    const resultado = await renameModule(
      inicial,
      form({ id: moduleId, title: "Módulo renomeado" }),
    );

    expect(resultado).toEqual({ ok: true });
    expect((await moduloPorId(moduleId))?.title).toBe("Módulo renomeado");
    expect((await moduloPorId(irmao.moduleId))?.title).toBe("Irmão intacto");
  });

  it("setModuleArchived preenche e limpa archivedAt", async () => {
    const { moduleId } = await semearAula();
    const irmao = await semearAula();

    await setModuleArchived(inicial, form({ id: moduleId, archived: "true" }));
    expect((await moduloPorId(moduleId))?.archivedAt).toBeInstanceOf(Date);
    expect((await moduloPorId(irmao.moduleId))?.archivedAt).toBeNull();

    await setModuleArchived(inicial, form({ id: moduleId, archived: "false" }));
    expect((await moduloPorId(moduleId))?.archivedAt).toBeNull();
  });

  it("moveModule troca as posições de dois módulos do mesmo curso", async () => {
    const { courseId, moduleId: a } = await semearAula();
    const [outro] = await db
      .insert(modules)
      .values({ courseId, title: "Outro", position: 1 })
      .returning({ id: modules.id });
    if (!outro) throw new Error("o segundo módulo não foi criado");

    const resultado = await moveModule(
      inicial,
      form({ id: a, direction: "down" }),
    );

    expect(resultado).toEqual({ ok: true });
    expect((await moduloPorId(a))?.position).toBe(1);
    expect((await moduloPorId(outro.id))?.position).toBe(0);
  });

  it("createLesson grava a aula no fim da lista do módulo", async () => {
    const { moduleId } = await semearAula();

    const resultado = await createLesson(
      inicial,
      form({ moduleId, title: "Segunda aula" }),
    );

    expect(resultado).toEqual({ ok: true });
    const linhas = await db.query.lessons.findMany({
      where: eq(lessons.moduleId, moduleId),
    });
    const nova = linhas.find((l) => l.title === "Segunda aula");
    expect(linhas).toHaveLength(2);
    expect(nova?.position).toBe(1);
  });

  it("renameLesson muda o título da aula", async () => {
    const { lessonId } = await semearAula();
    const irmao = await semearAula({ lessonTitle: "Irmã intacta" });

    const resultado = await renameLesson(
      inicial,
      form({ id: lessonId, title: "Aula renomeada" }),
    );

    expect(resultado).toEqual({ ok: true });
    expect((await aulaPorId(lessonId))?.title).toBe("Aula renomeada");
    expect((await aulaPorId(irmao.lessonId))?.title).toBe("Irmã intacta");
  });

  it("setLessonArchived preenche e limpa archivedAt", async () => {
    const { lessonId } = await semearAula();
    const irmao = await semearAula();

    await setLessonArchived(inicial, form({ id: lessonId, archived: "true" }));
    expect((await aulaPorId(lessonId))?.archivedAt).toBeInstanceOf(Date);
    expect((await aulaPorId(irmao.lessonId))?.archivedAt).toBeNull();

    await setLessonArchived(inicial, form({ id: lessonId, archived: "false" }));
    expect((await aulaPorId(lessonId))?.archivedAt).toBeNull();
  });

  it("moveLesson troca as posições de duas aulas do mesmo módulo", async () => {
    const { moduleId, lessonId: a } = await semearAula();
    const [outra] = await db
      .insert(lessons)
      .values({ moduleId, title: "Outra", position: 1 })
      .returning({ id: lessons.id });
    if (!outra) throw new Error("a segunda aula não foi criada");

    const resultado = await moveLesson(
      inicial,
      form({ id: a, direction: "down" }),
    );

    expect(resultado).toEqual({ ok: true });
    expect((await aulaPorId(a))?.position).toBe(1);
    expect((await aulaPorId(outra.id))?.position).toBe(0);
  });

  it("setLessonStudied marca e desmarca studiedOn", async () => {
    const { lessonId } = await semearAula();
    const irmao = await semearAula();

    await setLessonStudied(inicial, form({ id: lessonId, studied: "true" }));
    expect((await aulaPorId(lessonId))?.studiedOn).toBeInstanceOf(Date);
    expect((await aulaPorId(irmao.lessonId))?.studiedOn).toBeNull();

    await setLessonStudied(inicial, form({ id: lessonId, studied: "false" }));
    expect((await aulaPorId(lessonId))?.studiedOn).toBeNull();
  });
});
