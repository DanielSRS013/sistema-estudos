import { describe, expect, it } from "vitest";

import { noteKindEnum } from "@/db/schema";

import { isNoteKind, NOTE_KINDS, noteKindLabel, noteKindOptions } from "./kind";

describe("noteKindLabel", () => {
  it("escreve os três tipos como o handoff escreve", () => {
    expect(noteKindLabel("lesson_note")).toBe("Anotação de aula");
    expect(noteKindLabel("summary")).toBe("Resumo");
    expect(noteKindLabel("solution")).toBe("Resolução");
  });
});

describe("NOTE_KINDS", () => {
  it("cobre todo valor do enum do banco", () => {
    expect([...NOTE_KINDS].sort()).toEqual([...noteKindEnum.enumValues].sort());
  });

  it("começa pelo tipo que toda nota recebe ao nascer", () => {
    expect(NOTE_KINDS[0]).toBe("lesson_note");
  });
});

describe("noteKindOptions", () => {
  it("dá valor e rótulo na ordem da interface", () => {
    expect(noteKindOptions()).toEqual([
      { value: "lesson_note", label: "Anotação de aula" },
      { value: "summary", label: "Resumo" },
      { value: "solution", label: "Resolução" },
    ]);
  });

  it("não deixa nenhum tipo sem rótulo", () => {
    for (const { label } of noteKindOptions()) {
      expect(label.trim()).not.toBe("");
    }
  });
});

describe("isNoteKind", () => {
  it("aceita os valores do enum", () => {
    for (const kind of NOTE_KINDS) expect(isNoteKind(kind)).toBe(true);
  });

  it("recusa o que não é tipo de nota", () => {
    expect(isNoteKind("")).toBe(false);
    expect(isNoteKind("Anotação de aula")).toBe(false);
    expect(isNoteKind("lesson")).toBe(false);
  });
});
