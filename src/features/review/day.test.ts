import { describe, expect, it } from "vitest";

import { dayEnd, dayStart, daysUntil, logicalDay, streak } from "./day";

/** Instante a partir de uma hora de parede em São Paulo (UTC−3 o ano todo). */
function emSaoPaulo(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

describe("logicalDay", () => {
  it("conta 01:00 como o dia anterior — estudar de madrugada não pula o dia", () => {
    expect(logicalDay(emSaoPaulo("2026-10-19T01:00:00"))).toBe("2026-10-18");
  });

  it("vira o dia às 04:00", () => {
    expect(logicalDay(emSaoPaulo("2026-10-19T03:59:59"))).toBe("2026-10-18");
    expect(logicalDay(emSaoPaulo("2026-10-19T04:00:00"))).toBe("2026-10-19");
  });

  it("usa o fuso de São Paulo, não o UTC", () => {
    // 2026-10-20T02:00Z é 2026-10-19T23:00 em São Paulo.
    expect(logicalDay(new Date("2026-10-20T02:00:00Z"))).toBe("2026-10-19");
  });
});

describe("dayStart", () => {
  it("devolve o corte das 04:00 do dia lógico corrente", () => {
    expect(dayStart(emSaoPaulo("2026-10-19T01:00:00")).toISOString()).toBe(
      emSaoPaulo("2026-10-18T04:00:00").toISOString(),
    );
    expect(dayStart(emSaoPaulo("2026-10-19T22:30:00")).toISOString()).toBe(
      emSaoPaulo("2026-10-19T04:00:00").toISOString(),
    );
  });
});

describe("dayEnd", () => {
  it("devolve o corte das 04:00 do dia lógico seguinte", () => {
    expect(dayEnd(emSaoPaulo("2026-10-19T22:30:00")).toISOString()).toBe(
      emSaoPaulo("2026-10-20T04:00:00").toISOString(),
    );
  });

  it("de madrugada, fecha no corte que ainda vai chegar", () => {
    expect(dayEnd(emSaoPaulo("2026-10-19T01:00:00")).toISOString()).toBe(
      emSaoPaulo("2026-10-19T04:00:00").toISOString(),
    );
  });
});

describe("daysUntil", () => {
  it("mede a distância em dias lógicos, não em 24 horas", () => {
    const agora = emSaoPaulo("2026-10-19T23:00:00");

    // Duas horas depois no relógio, mas já é o dia seguinte na fila.
    expect(daysUntil(emSaoPaulo("2026-10-20T01:00:00"), agora)).toBe(0);
    expect(daysUntil(emSaoPaulo("2026-10-20T08:00:00"), agora)).toBe(1);
    expect(daysUntil(emSaoPaulo("2026-10-22T08:00:00"), agora)).toBe(3);
  });

  it("nunca devolve negativo para o que já venceu", () => {
    expect(
      daysUntil(
        emSaoPaulo("2026-10-10T08:00:00"),
        emSaoPaulo("2026-10-19T08:00:00"),
      ),
    ).toBe(0);
  });
});

describe("streak", () => {
  it("conta os dias consecutivos terminando hoje", () => {
    expect(
      streak(["2026-10-19", "2026-10-18", "2026-10-17"], "2026-10-19"),
    ).toBe(3);
  });

  it("segue valendo se hoje ainda não teve revisão — o dia não acabou", () => {
    expect(streak(["2026-10-18", "2026-10-17"], "2026-10-19")).toBe(2);
  });

  it("zera quando o buraco passa de um dia", () => {
    expect(streak(["2026-10-17", "2026-10-16"], "2026-10-19")).toBe(0);
  });

  it("para no primeiro buraco", () => {
    expect(
      streak(["2026-10-19", "2026-10-18", "2026-10-16"], "2026-10-19"),
    ).toBe(2);
  });

  it("não se perde com dia repetido nem com lista fora de ordem", () => {
    expect(
      streak(
        ["2026-10-18", "2026-10-19", "2026-10-19", "2026-10-17"],
        "2026-10-19",
      ),
    ).toBe(3);
  });

  it("é zero sem nenhum dia", () => {
    expect(streak([], "2026-10-19")).toBe(0);
  });
});
