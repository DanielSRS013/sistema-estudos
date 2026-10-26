import { describe, expect, expectTypeOf, it } from "vitest";

import { type ActionState, idleState } from "./action-state";

/** Estreita a união como a UI faz: só o ramo de falha alcança `message`. */
function mensagemDe(estado: ActionState): string | null {
  if (estado.ok === false) return estado.message;

  // @ts-expect-error `message` não existe no ramo `ok: true`.
  void estado.message;

  return null;
}

describe("idleState", () => {
  it("é o estado de sucesso, em runtime", () => {
    expect(idleState).toEqual({ ok: true });
  });
});

describe("ActionState", () => {
  it("discrimina por `ok`: a falha carrega a mensagem", () => {
    expect(mensagemDe({ ok: false, message: "Título obrigatório" })).toBe(
      "Título obrigatório",
    );
    expect(mensagemDe({ ok: true })).toBeNull();
  });

  it("é a união de sucesso sem mensagem e falha com mensagem", () => {
    expectTypeOf<ActionState>().toEqualTypeOf<
      { ok: true } | { ok: false; message: string }
    >();
    expectTypeOf<Extract<ActionState, { ok: false }>>().toEqualTypeOf<{
      ok: false;
      message: string;
    }>();
  });
});
