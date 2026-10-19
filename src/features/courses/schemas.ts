// Validação da entrada das Server Actions. A forma vem do schema do banco
// (drizzle-zod); as mensagens são escritas à mão porque voltam para a tela.

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { courses, lessons, modules } from "@/db/schema";

const title = z
  .string({ error: "Informe um título." })
  .trim()
  .min(1, "O título não pode ficar vazio.")
  .max(200, "O título precisa ter no máximo 200 caracteres.");

const track = z
  .string()
  .trim()
  .max(200, "A especialização precisa ter no máximo 200 caracteres.")
  .optional()
  .transform((value) => (value ? value : null));

const id = z.uuid({ error: "Registro não encontrado." });

const direction = z.enum(["up", "down"], { error: "Direção inválida." });

// "true"/"false" porque a origem é um <input type="hidden"> de formulário.
const archived = z
  .enum(["true", "false"], { error: "Valor inválido." })
  .transform((value) => value === "true");

const courseInsert = createInsertSchema(courses);
const moduleInsert = createInsertSchema(modules);
const lessonInsert = createInsertSchema(lessons);

export const createCourseSchema = courseInsert
  .pick({ title: true, track: true })
  .extend({ title, track });

export const createModuleSchema = moduleInsert
  .pick({ courseId: true, title: true })
  .extend({ courseId: id, title });

export const createLessonSchema = lessonInsert
  .pick({ moduleId: true, title: true })
  .extend({ moduleId: id, title });

export const renameSchema = z.object({ id, title });

export const moveSchema = z.object({ id, direction });

export const setArchivedSchema = z.object({ id, archived });

export type CreateCourseInput = z.output<typeof createCourseSchema>;
export type CreateModuleInput = z.output<typeof createModuleSchema>;
export type CreateLessonInput = z.output<typeof createLessonSchema>;
export type RenameInput = z.output<typeof renameSchema>;
export type MoveInput = z.output<typeof moveSchema>;
export type SetArchivedInput = z.output<typeof setArchivedSchema>;
