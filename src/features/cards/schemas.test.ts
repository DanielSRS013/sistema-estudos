import { describe, expect, it } from "vitest";

import { setCardSuspendedSchema } from "./schemas";

const ID = "5c1e3f3a-1f7e-4a2b-8e6d-1b2c3d4e5f60";

function parse(id: unknown, suspended: unknown) {
  return setCardSuspendedSchema.safeParse({ id, suspended });
}

describe("setCardSuspendedSchema", () => {
  it("converte o campo escondido do formulário em booleano", () => {
    expect(parse(ID, "true").data).toEqual({ id: ID, suspended: true });
    expect(parse(ID, "false").data).toEqual({ id: ID, suspended: false });
  });

  it("recusa id que não é uuid, com mensagem legível", () => {
    const parsed = parse("card-7", "true");

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Card não encontrado.");
  });

  it("recusa valor que não é true nem false em vez de virar false", () => {
    const parsed = parse(ID, "sim");

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Valor inválido.");
  });

  it("recusa campo ausente", () => {
    expect(setCardSuspendedSchema.safeParse({ id: ID }).success).toBe(false);
    expect(parse(undefined, "true").success).toBe(false);
  });
});
