import { describe, expect, it } from "vitest";

import { saveStatusLabel, type SaveStatus } from "./status";

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
