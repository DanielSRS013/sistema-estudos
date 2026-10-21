import { describe, expect, it } from "vitest";

import {
  createNoteSchema,
  moveNoteSchema,
  saveNoteSchema,
  setNoteKindSchema,
} from "./schemas";

const ID = "4f3b9f7e-2a4f-4c1e-9f9c-2b7a1d5e6c80";
const OUTRO_ID = "9c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";

describe("createNoteSchema", () => {
  it("aceita um título e a aula de origem", () => {
    const parsed = createNoteSchema.safeParse({
      lessonId: ID,
      title: "  Projeção vetorial  ",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.title).toBe("Projeção vetorial");
  });

  it("recusa título vazio com mensagem legível", () => {
    const parsed = createNoteSchema.safeParse({ lessonId: ID, title: "   " });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      "O título não pode ficar vazio.",
    );
  });

  it("recusa aula que não é um id", () => {
    const parsed = createNoteSchema.safeParse({ lessonId: "aula-7", title: "N" });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Aula não encontrada.");
  });
});

describe("saveNoteSchema", () => {
  it("aceita conteúdo vazio: nota recém-criada ainda não tem texto", () => {
    const parsed = saveNoteSchema.safeParse({
      id: ID,
      title: "Projeção",
      content: "",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.content).toBe("");
  });

  it("preserva o conteúdo literalmente, inclusive espaços de indentação", () => {
    const content = "# Título\n\n    código indentado\n\n$$x^2$$\n";
    const parsed = saveNoteSchema.safeParse({ id: ID, title: "T", content });

    expect(parsed.data?.content).toBe(content);
  });

  it("recusa nota que não é um id", () => {
    const parsed = saveNoteSchema.safeParse({
      id: "nota",
      title: "T",
      content: "",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Nota não encontrada.");
  });
});

describe("moveNoteSchema", () => {
  it("aceita a nota e a aula de destino", () => {
    const parsed = moveNoteSchema.safeParse({ id: ID, lessonId: OUTRO_ID });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ id: ID, lessonId: OUTRO_ID });
  });

  it("recusa destino ausente", () => {
    const parsed = moveNoteSchema.safeParse({ id: ID, lessonId: "" });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Aula não encontrada.");
  });
});

describe("setNoteKindSchema", () => {
  it("aceita um valor do enum", () => {
    const parsed = setNoteKindSchema.safeParse({ id: ID, kind: "summary" });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ id: ID, kind: "summary" });
  });

  it("recusa o rótulo da interface no lugar do valor", () => {
    const parsed = setNoteKindSchema.safeParse({ id: ID, kind: "Resumo" });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Tipo de nota inválido.");
  });

  it("recusa tipo ausente", () => {
    const parsed = setNoteKindSchema.safeParse({ id: ID });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Tipo de nota inválido.");
  });

  it("recusa nota que não é um id", () => {
    const parsed = setNoteKindSchema.safeParse({
      id: "nota",
      kind: "lesson_note",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Nota não encontrada.");
  });
});
