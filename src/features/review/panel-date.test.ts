import { describe, expect, it } from "vitest";

import { panelDateLabel } from "./panel-date";

/** Instante a partir de uma hora de parede em São Paulo (UTC−3 o ano todo). */
function emSaoPaulo(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

describe("panelDateLabel", () => {
  it("escreve o dia da semana, o dia e o mês, com inicial maiúscula", () => {
    expect(panelDateLabel(emSaoPaulo("2026-10-20T12:00:00"))).toBe(
      "Terça-feira, 20 de outubro",
    );
  });

  it("segue o dia lógico de SPEC §4: antes das 04:00 ainda é ontem", () => {
    // O painel conta a fila do dia lógico; a data do cabeçalho diz o mesmo dia.
    expect(panelDateLabel(emSaoPaulo("2026-10-21T02:00:00"))).toBe(
      "Terça-feira, 20 de outubro",
    );
    expect(panelDateLabel(emSaoPaulo("2026-10-21T04:30:00"))).toBe(
      "Quarta-feira, 21 de outubro",
    );
  });

  it("não depende do fuso do servidor", () => {
    // 2026-10-18T02:00Z é 2026-10-17T23:00 em São Paulo: ainda sábado.
    expect(panelDateLabel(new Date("2026-10-18T02:00:00Z"))).toBe(
      "Sábado, 17 de outubro",
    );
  });
});
