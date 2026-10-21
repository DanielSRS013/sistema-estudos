// O tipo da nota, do domínio para a tela. Puro: entra o valor do enum, sai o
// texto em português que o handoff escreve ("Anotação de aula", "Resumo",
// "Resolução") — na linha da aula, no meta da leitura e no seletor do editor.
//
// O tipo vem do enum do banco, e só o tipo: `import type` some no build, e o
// seletor é `"use client"` — importar o schema como valor levaria os dez
// `pgTable` e o drizzle inteiro para o navegador (`client-bundle.test.ts`).
//
// Um tipo novo no schema quebra o `Record` no `tsc` antes de chegar à tela sem
// rótulo, o `satisfies` recusa valor inventado na lista, e `kind.test.ts` —
// que roda em node e pode ler o enum de verdade — pega a lista desatualizada.

import type { noteKindEnum } from "@/db/schema";

export type NoteKind = (typeof noteKindEnum.enumValues)[number];

const ROTULOS: Record<NoteKind, string> = {
  lesson_note: "Anotação de aula",
  summary: "Resumo",
  solution: "Resolução",
};

/**
 * Os tipos na ordem em que a interface os oferece — a mesma do handoff, e a
 * primeira é a que toda nota recebe ao nascer.
 */
export const NOTE_KINDS = [
  "lesson_note",
  "summary",
  "solution",
] as const satisfies readonly NoteKind[];

export function noteKindLabel(kind: NoteKind): string {
  return ROTULOS[kind];
}

/**
 * Se um texto qualquer é um tipo de nota. O `<select>` devolve `string`, e é
 * aqui que ele estreita — sem asserção, o `tsc` cobre a troca de tipo.
 */
export function isNoteKind(value: string): value is NoteKind {
  return (NOTE_KINDS as readonly string[]).includes(value);
}

/** Valor e rótulo de cada tipo, pronto para o seletor. */
export function noteKindOptions(): { value: NoteKind; label: string }[] {
  return NOTE_KINDS.map((value) => ({ value, label: ROTULOS[value] }));
}
