import { describe, expect, it } from "vitest";

import {
  createCourseSchema,
  createModuleSchema,
  moveSchema,
  renameSchema,
  setArchivedSchema,
  setStudiedSchema,
} from "./schemas";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("createCourseSchema", () => {
  it("apara o título e normaliza especialização vazia para null", () => {
    const parsed = createCourseSchema.parse({
      title: "  Linear Algebra  ",
      track: "   ",
    });
    expect(parsed).toEqual({
      title: "Linear Algebra",
      track: null,
      provider: null,
    });
  });

  it("apara a instituição e aceita ausência dela", () => {
    expect(
      createCourseSchema.parse({
        title: "Linear Algebra",
        track: "Mathematics for ML",
        provider: "  Imperial College  ",
      }),
    ).toEqual({
      title: "Linear Algebra",
      track: "Mathematics for ML",
      provider: "Imperial College",
    });

    expect(createCourseSchema.parse({ title: "Avulso" }).provider).toBe(null);
  });

  it("recusa instituição acima de 200 caracteres", () => {
    const result = createCourseSchema.safeParse({
      title: "Linear Algebra",
      provider: "a".repeat(201),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("200 caracteres");
  });

  it("recusa título vazio com mensagem legível", () => {
    const result = createCourseSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "O título não pode ficar vazio.",
    );
  });

  it("recusa título acima de 200 caracteres", () => {
    const result = createCourseSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("200 caracteres");
  });

  it("recusa título ausente", () => {
    expect(createCourseSchema.safeParse({}).success).toBe(false);
  });
});

describe("createModuleSchema", () => {
  it("aceita curso identificado por uuid", () => {
    expect(
      createModuleSchema.parse({ courseId: uuid, title: "Vetores" }),
    ).toEqual({ courseId: uuid, title: "Vetores" });
  });

  it("recusa courseId que não é uuid", () => {
    const result = createModuleSchema.safeParse({
      courseId: "nao-sou-uuid",
      title: "Vetores",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Registro não encontrado.");
  });
});

describe("renameSchema", () => {
  it("apara o novo título", () => {
    expect(renameSchema.parse({ id: uuid, title: " Projeção " })).toEqual({
      id: uuid,
      title: "Projeção",
    });
  });
});

describe("moveSchema", () => {
  it("aceita up e down", () => {
    expect(moveSchema.parse({ id: uuid, direction: "up" }).direction).toBe(
      "up",
    );
    expect(moveSchema.parse({ id: uuid, direction: "down" }).direction).toBe(
      "down",
    );
  });

  it("recusa qualquer outra direção", () => {
    const result = moveSchema.safeParse({ id: uuid, direction: "left" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Direção inválida.");
  });
});

describe("setArchivedSchema", () => {
  it("converte a string do formulário em booleano", () => {
    expect(setArchivedSchema.parse({ id: uuid, archived: "true" })).toEqual({
      id: uuid,
      archived: true,
    });
    expect(setArchivedSchema.parse({ id: uuid, archived: "false" })).toEqual({
      id: uuid,
      archived: false,
    });
  });

  it("recusa valores fora do par", () => {
    expect(
      setArchivedSchema.safeParse({ id: uuid, archived: "talvez" }).success,
    ).toBe(false);
  });
});

describe("setStudiedSchema", () => {
  it("converte a string do formulário em booleano", () => {
    expect(setStudiedSchema.parse({ id: uuid, studied: "true" })).toEqual({
      id: uuid,
      studied: true,
    });
    expect(setStudiedSchema.parse({ id: uuid, studied: "false" })).toEqual({
      id: uuid,
      studied: false,
    });
  });

  it("recusa valores fora do par", () => {
    expect(
      setStudiedSchema.safeParse({ id: uuid, studied: "quase" }).success,
    ).toBe(false);
  });
});
