import { describe, expect, it } from "vitest";

import { saveLimitsSchema } from "./schemas";

function parse(newPerDay: unknown, reviewsPerDay: unknown) {
  return saveLimitsSchema.safeParse({ newPerDay, reviewsPerDay });
}

describe("saveLimitsSchema", () => {
  it("converte os dois campos de texto em números", () => {
    const parsed = parse("5", "50");

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ newPerDay: 5, reviewsPerDay: 50 });
  });

  it("aceita zero, que é pausar a entrada de novos", () => {
    expect(parse("0", "0").data).toEqual({ newPerDay: 0, reviewsPerDay: 0 });
  });

  it("recusa campo vazio em vez de virar zero", () => {
    const parsed = parse("", "200");

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      "Novos por dia: use um número inteiro de 0 a 999.",
    );
  });

  it("recusa negativo, fracionário e texto", () => {
    expect(parse("-1", "200").success).toBe(false);
    expect(parse("1.5", "200").success).toBe(false);
    expect(parse("1,5", "200").success).toBe(false);
    expect(parse("vinte", "200").success).toBe(false);
    expect(parse("20", "duzentos").success).toBe(false);
  });

  it("recusa acima do teto, com mensagem legível", () => {
    const parsed = parse("20", "10000");

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      "Revisões por dia: o máximo é 9999.",
    );
  });

  it("recusa campo ausente", () => {
    expect(saveLimitsSchema.safeParse({ newPerDay: "20" }).success).toBe(false);
  });
});
