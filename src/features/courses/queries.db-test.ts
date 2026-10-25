import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { courses, lessons } from "@/db/schema";
import { semearAula } from "@/shared/test-seed";

import {
  fetchRail,
  getCourseBySlug,
  getLessonById,
  listCourseIds,
  listCourses,
} from "./queries";

describe("queries de cursos", () => {
  it("fetchRail traz curso com módulos e aulas, na ordem de position", async () => {
    const { courseId, moduleId, lessonId: primeira } = await semearAula({
      lessonTitle: "Segunda",
    });
    // A aula semeada fica em position 1; a outra entra em position 0.
    await db.update(lessons).set({ position: 1 }).where(eq(lessons.id, primeira));
    const [outra] = await db
      .insert(lessons)
      .values({ moduleId, title: "Primeira", position: 0 })
      .returning({ id: lessons.id });
    if (!outra) throw new Error("a segunda aula não foi criada");

    const rail = await fetchRail();
    const curso = rail.find((c) => c.id === courseId);

    expect(curso?.modules).toHaveLength(1);
    expect(curso?.modules[0]?.lessons.map((l) => l.title)).toEqual([
      "Primeira",
      "Segunda",
    ]);
    expect(curso?.modules[0]?.lessons.map((l) => l.id)).toEqual([
      outra.id,
      primeira,
    ]);
  });

  it("fetchRail omite curso arquivado", async () => {
    const ativo = await semearAula();
    const arquivado = await semearAula();
    await db
      .update(courses)
      .set({ archivedAt: new Date() })
      .where(eq(courses.id, arquivado.courseId));

    const ids = (await fetchRail()).map((c) => c.id);

    expect(ids).toContain(ativo.courseId);
    expect(ids).not.toContain(arquivado.courseId);
  });

  it("listCourses conta aulas e aulas estudadas", async () => {
    const { courseId, moduleId, lessonId } = await semearAula();
    await db
      .update(lessons)
      .set({ studiedOn: new Date() })
      .where(eq(lessons.id, lessonId));
    await db.insert(lessons).values({ moduleId, title: "Não estudada" });

    const linha = (await listCourses()).find((c) => c.id === courseId);

    expect(linha?.moduleCount).toBe(1);
    expect(linha?.lessonCount).toBe(2);
    expect(linha?.studiedCount).toBe(1);
  });

  it("getCourseBySlug devolve null para slug inexistente", async () => {
    expect(await getCourseBySlug("nao-existe")).toBeNull();
  });

  it("getCourseBySlug traz o curso semeado com seus módulos", async () => {
    const { courseId, courseSlug, moduleId } = await semearAula();

    const curso = await getCourseBySlug(courseSlug);

    expect(curso?.id).toBe(courseId);
    expect(curso?.modules.map((m) => m.id)).toEqual([moduleId]);
  });

  it("listCourseIds inclui o arquivado, na ordem de position", async () => {
    // A inclusão é proposital: as setas de mover dependem da ordem de
    // `position`, que não conhece arquivamento (moveCourse também move
    // arquivados). Excluir o arquivado faria as setas errarem as pontas.
    // Criados nesta ordem, mas com position invertida: se o orderBy perder
    // `position`, a lista sai na ordem de criação (o desempate) e o teste falha.
    const primeiro = await semearAula();
    const meio = await semearAula();
    const ultimo = await semearAula();
    const posicoes = [
      [primeiro.courseId, 9102],
      [meio.courseId, 9101],
      [ultimo.courseId, 9100],
    ] as const;
    for (const [id, position] of posicoes) {
      await db.update(courses).set({ position }).where(eq(courses.id, id));
    }
    await db
      .update(courses)
      .set({ archivedAt: new Date() })
      .where(eq(courses.id, meio.courseId));

    const meus = new Set([primeiro.courseId, meio.courseId, ultimo.courseId]);
    const ids = (await listCourseIds()).filter((id) => meus.has(id));

    expect(ids).toEqual([ultimo.courseId, meio.courseId, primeiro.courseId]);
  });

  it("getLessonById traz o caminho curso · aula", async () => {
    const { courseId, moduleId, lessonId } = await semearAula({
      courseTitle: "Cálculo",
      lessonTitle: "Limites",
    });

    const aula = await getLessonById(lessonId);

    expect(aula?.title).toBe("Limites");
    expect(aula?.module.id).toBe(moduleId);
    expect(aula?.module.course.id).toBe(courseId);
    expect(aula?.module.course.title).toBe("Cálculo");
    expect(aula?.module.lessons.map((l) => l.id)).toContain(lessonId);
  });

  it("getLessonById devolve null para id inexistente", async () => {
    expect(
      await getLessonById("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });
});
