"use server";

import { inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { courses, lessons, modules } from "@/db/schema";

import { neighborFor, swapPositions } from "./reorder";
import {
  createCourseSchema,
  createLessonSchema,
  createModuleSchema,
  moveSchema,
  renameSchema,
  setArchivedSchema,
} from "./schemas";
import { uniqueSlug } from "./slug";
import type { ActionState } from "@/shared/action-state";

/* ───────────────────────────── infraestrutura ────────────────────────── */

const FALHA_GENERICA =
  "Não foi possível salvar agora. Confira a conexão e tente de novo.";

/**
 * Toda action segue o mesmo contrato: valida, escreve, revalida. Erro de
 * validação volta com a mensagem do schema; qualquer outro erro vira uma
 * frase única — a stack fica no log do servidor, não na tela.
 */
async function run<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  write: (input: z.output<S>) => Promise<void>,
): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Entrada inválida.";
    return { ok: false, message };
  }

  try {
    await write(parsed.data);
  } catch (error) {
    console.error(error);
    return { ok: false, message: FALHA_GENERICA };
  }

  // O rail aparece em todas as rotas desta fatia, então a revalidação é do
  // layout inteiro: qualquer renomeação precisa chegar à navegação.
  revalidatePath("/", "layout");

  return { ok: true };
}

/** Próxima posição livre dentro do escopo (fim da lista). */
function nextPosition(rows: readonly { position: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
}

/* ──────────────────────────────── cursos ─────────────────────────────── */

export async function createCourse(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(createCourseSchema, formData, async ({ title, track }) => {
    const existing = await db
      .select({ slug: courses.slug, position: courses.position })
      .from(courses);

    await db.insert(courses).values({
      title,
      track,
      slug: uniqueSlug(
        title,
        existing.map((row) => row.slug),
      ),
      position: nextPosition(existing),
    });
  });
}

export async function renameCourse(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(renameSchema, formData, async ({ id, title }) => {
    await db
      .update(courses)
      .set({ title })
      .where(sql`${courses.id} = ${id}`);
  });
}

export async function setCourseArchived(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(setArchivedSchema, formData, async ({ id, archived }) => {
    await db
      .update(courses)
      .set({ archivedAt: archived ? new Date() : null })
      .where(sql`${courses.id} = ${id}`);
  });
}

export async function moveCourse(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(moveSchema, formData, async ({ id, direction }) => {
    const siblings = await db
      .select({ id: courses.id, position: courses.position })
      .from(courses);

    const current = siblings.find((row) => row.id === id);
    const neighbor = neighborFor(siblings, id, direction);

    if (!current || !neighbor) return;

    await db
      .update(courses)
      .set({ position: swapPositions(current, neighbor) })
      .where(inArray(courses.id, [current.id, neighbor.id]));
  });
}

/* ──────────────────────────────── módulos ────────────────────────────── */

export async function createModule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(createModuleSchema, formData, async ({ courseId, title }) => {
    const siblings = await db
      .select({ position: modules.position })
      .from(modules)
      .where(sql`${modules.courseId} = ${courseId}`);

    await db
      .insert(modules)
      .values({ courseId, title, position: nextPosition(siblings) });
  });
}

export async function renameModule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(renameSchema, formData, async ({ id, title }) => {
    await db
      .update(modules)
      .set({ title })
      .where(sql`${modules.id} = ${id}`);
  });
}

export async function setModuleArchived(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(setArchivedSchema, formData, async ({ id, archived }) => {
    await db
      .update(modules)
      .set({ archivedAt: archived ? new Date() : null })
      .where(sql`${modules.id} = ${id}`);
  });
}

export async function moveModule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(moveSchema, formData, async ({ id, direction }) => {
    const target = await db.query.modules.findFirst({
      where: (m, { eq }) => eq(m.id, id),
      columns: { id: true, courseId: true, position: true },
    });

    if (!target) return;

    const siblings = await db
      .select({ id: modules.id, position: modules.position })
      .from(modules)
      .where(sql`${modules.courseId} = ${target.courseId}`);

    const neighbor = neighborFor(siblings, id, direction);

    if (!neighbor) return;

    await db
      .update(modules)
      .set({ position: swapPositions(target, neighbor) })
      .where(inArray(modules.id, [target.id, neighbor.id]));
  });
}

/* ───────────────────────────────── aulas ─────────────────────────────── */

export async function createLesson(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(createLessonSchema, formData, async ({ moduleId, title }) => {
    const siblings = await db
      .select({ position: lessons.position })
      .from(lessons)
      .where(sql`${lessons.moduleId} = ${moduleId}`);

    await db
      .insert(lessons)
      .values({ moduleId, title, position: nextPosition(siblings) });
  });
}

export async function renameLesson(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(renameSchema, formData, async ({ id, title }) => {
    await db
      .update(lessons)
      .set({ title })
      .where(sql`${lessons.id} = ${id}`);
  });
}

export async function setLessonArchived(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(setArchivedSchema, formData, async ({ id, archived }) => {
    await db
      .update(lessons)
      .set({ archivedAt: archived ? new Date() : null })
      .where(sql`${lessons.id} = ${id}`);
  });
}

export async function moveLesson(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(moveSchema, formData, async ({ id, direction }) => {
    const target = await db.query.lessons.findFirst({
      where: (l, { eq }) => eq(l.id, id),
      columns: { id: true, moduleId: true, position: true },
    });

    if (!target) return;

    const siblings = await db
      .select({ id: lessons.id, position: lessons.position })
      .from(lessons)
      .where(sql`${lessons.moduleId} = ${target.moduleId}`);

    const neighbor = neighborFor(siblings, id, direction);

    if (!neighbor) return;

    await db
      .update(lessons)
      .set({ position: swapPositions(target, neighbor) })
      .where(inArray(lessons.id, [target.id, neighbor.id]));
  });
}
