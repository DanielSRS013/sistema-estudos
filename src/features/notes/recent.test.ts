import { describe, expect, it } from "vitest";

import { lastEditLabel } from "./recent";

/** Instante a partir de uma hora de parede em São Paulo (UTC−3 o ano todo). */
function emSaoPaulo(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

const agora = emSaoPaulo("2026-10-20T10:30:00");

describe("lastEditLabel", () => {
  it("mostra a hora quando a edição foi hoje", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-20T08:05:00"), agora)).toBe(
      "hoje 08:05",
    );
  });

  it("diz ontem com a hora, mesmo passada a meia-noite", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-19T23:47:00"), agora)).toBe(
      "ontem 23:47",
    );
  });

  it("vira dia e mês a partir de dois dias atrás", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-14T09:00:00"), agora)).toBe(
      "14/10",
    );
  });

  it("inclui o ano quando a edição é de outro ano", () => {
    expect(lastEditLabel(emSaoPaulo("2025-12-31T22:00:00"), agora)).toBe(
      "31/12/2025",
    );
  });

  it("conta o dia no fuso de São Paulo, não no UTC", () => {
    // 2026-10-20T02:00Z é 2026-10-19T23:00 em São Paulo: ontem, não hoje.
    expect(lastEditLabel(new Date("2026-10-20T02:00:00Z"), agora)).toBe(
      "ontem 23:00",
    );
  });

  it("não inventa futuro: edição adiante do relógio ainda é hoje", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-20T10:31:00"), agora)).toBe(
      "hoje 10:31",
    );
  });
});
