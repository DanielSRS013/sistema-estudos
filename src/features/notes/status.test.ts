import { describe, expect, it } from "vitest";

import {
  saveStatusLabel,
  shouldAutosave,
  type SaveStatus,
} from "./status";

describe("saveStatusLabel", () => {
  it("não mostra nada quando nada aconteceu ainda", () => {
    expect(saveStatusLabel({ kind: "idle" })).toBeNull();
  });

  it("anuncia a gravação em andamento", () => {
    expect(saveStatusLabel({ kind: "saving" })).toBe("Salvando…");
  });

  it("mostra a hora da última gravação no fuso de São Paulo", () => {
    const status: SaveStatus = {
      kind: "saved",
      at: new Date("2026-10-19T21:42:00.000Z"),
    };

    expect(saveStatusLabel(status)).toBe("Salvo 18:42");
  });

  it("usa a hora local mesmo quando o UTC já virou o dia", () => {
    const status: SaveStatus = {
      kind: "saved",
      at: new Date("2026-10-20T02:30:00.000Z"),
    };

    expect(saveStatusLabel(status)).toBe("Salvo 23:30");
  });

  it("devolve a mensagem do erro, que já vem legível da action", () => {
    const status: SaveStatus = {
      kind: "error",
      message: "Não foi possível salvar agora. Confira a conexão.",
    };

    expect(saveStatusLabel(status)).toBe(
      "Não foi possível salvar agora. Confira a conexão.",
    );
  });
});

describe("shouldAutosave", () => {
  const gravado = { title: "Limites", content: "# Limites" };
  const editado = { title: "Limites", content: "# Limites\n\nnovo" };

  it("grava quando o texto mudou e nada está em voo", () => {
    expect(
      shouldAutosave({
        draft: editado,
        saved: gravado,
        saving: false,
        failed: null,
      }),
    ).toBe(true);
  });

  it("não grava quando o texto é o que o servidor já tem", () => {
    expect(
      shouldAutosave({
        draft: gravado,
        saved: gravado,
        saving: false,
        failed: null,
      }),
    ).toBe(false);
  });

  it("não grava por cima de uma gravação em voo", () => {
    expect(
      shouldAutosave({
        draft: editado,
        saved: gravado,
        saving: true,
        failed: null,
      }),
    ).toBe(false);
  });

  it("não repete sozinho a gravação que acabou de falhar", () => {
    expect(
      shouldAutosave({
        draft: editado,
        saved: gravado,
        saving: false,
        failed: editado,
      }),
    ).toBe(false);
  });

  it("volta a tentar quando o usuário muda o texto que falhou", () => {
    const corrigido = { title: "Limites", content: "# Limites\n\ncorrigido" };

    expect(
      shouldAutosave({
        draft: corrigido,
        saved: gravado,
        saving: false,
        failed: editado,
      }),
    ).toBe(true);
  });
});
