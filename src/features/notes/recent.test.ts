import { describe, expect, it } from "vitest";

import { lastEditLabel } from "./recent";

/** Instante a partir de uma hora de parede em São Paulo (UTC−3 o ano todo). */
function emSaoPaulo(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

// Quarta-feira, 21 de outubro de 2026.
const agora = emSaoPaulo("2026-10-21T10:30:00");

describe("lastEditLabel", () => {
  it("diz agora quando a edição acabou de acontecer", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-21T10:29:31"), agora)).toBe(
      "agora",
    );
  });

  it("conta minutos na primeira hora", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-21T10:25:00"), agora)).toBe(
      "há 5 min",
    );
    expect(lastEditLabel(emSaoPaulo("2026-10-21T09:31:00"), agora)).toBe(
      "há 59 min",
    );
  });

  it("conta horas a partir de uma hora cheia", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-21T09:30:00"), agora)).toBe(
      "há 1 h",
    );
    expect(lastEditLabel(emSaoPaulo("2026-10-21T08:15:00"), agora)).toBe(
      "há 2 h",
    );
    expect(lastEditLabel(emSaoPaulo("2026-10-21T00:30:00"), agora)).toBe(
      "há 10 h",
    );
  });

  it("diz ontem quando o dia civil já virou, mesmo com poucas horas de diferença", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-20T23:00:00"), agora)).toBe(
      "ontem",
    );
  });

  it("os minutos vencem a virada do dia", () => {
    // 23:55 de ontem às 00:05 de hoje é "há 10 min", não "ontem".
    const madrugada = emSaoPaulo("2026-10-21T00:05:00");
    expect(lastEditLabel(emSaoPaulo("2026-10-20T23:55:00"), madrugada)).toBe(
      "há 10 min",
    );
  });

  it("usa o dia da semana entre dois e seis dias atrás", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-19T09:00:00"), agora)).toBe(
      "seg.",
    );
    expect(lastEditLabel(emSaoPaulo("2026-10-15T09:00:00"), agora)).toBe(
      "qui.",
    );
  });

  it("vira dia e mês a partir de uma semana", () => {
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
    // 2026-10-21T02:00Z é 2026-10-20T23:00 em São Paulo: ontem, não hoje.
    expect(lastEditLabel(new Date("2026-10-21T02:00:00Z"), agora)).toBe(
      "ontem",
    );
  });

  it("não inventa futuro: edição adiante do relógio é agora", () => {
    expect(lastEditLabel(emSaoPaulo("2026-10-21T10:31:00"), agora)).toBe(
      "agora",
    );
  });
});
