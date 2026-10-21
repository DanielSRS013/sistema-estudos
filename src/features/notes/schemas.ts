// Validação da entrada das Server Actions de nota. A forma vem do schema do
// banco (drizzle-zod); as mensagens são escritas à mão porque voltam para a
// tela.

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { noteKindEnum, notes } from "@/db/schema";

const title = z
  .string({ error: "Informe um título." })
  .trim()
  .min(1, "O título não pode ficar vazio.")
  .max(200, "O título precisa ter no máximo 200 caracteres.");

// O corpo da nota chega cru do textarea: nada de trim, porque indentação e
// linhas em branco são sintaxe de Markdown.
const content = z
  .string({ error: "Conteúdo inválido." })
  .max(200_000, "A nota passou de 200 mil caracteres. Divida em duas.");

// O seletor manda o valor do enum, não o rótulo: tipo fora da lista é entrada
// inválida, e a mensagem volta para a tela como qualquer outra.
const kind = z.enum(noteKindEnum.enumValues, {
  error: "Tipo de nota inválido.",
});

const noteId = z.uuid({ error: "Nota não encontrada." });
const lessonId = z.uuid({ error: "Aula não encontrada." });

const noteInsert = createInsertSchema(notes);

export const createNoteSchema = noteInsert
  .pick({ lessonId: true, title: true })
  .extend({ lessonId, title });

export const saveNoteSchema = z.object({ id: noteId, title, content });

export const moveNoteSchema = z.object({ id: noteId, lessonId });

export const setNoteKindSchema = z.object({ id: noteId, kind });

export type CreateNoteInput = z.output<typeof createNoteSchema>;
export type SaveNoteInput = z.output<typeof saveNoteSchema>;
export type MoveNoteInput = z.output<typeof moveNoteSchema>;
export type SetNoteKindInput = z.output<typeof setNoteKindSchema>;
