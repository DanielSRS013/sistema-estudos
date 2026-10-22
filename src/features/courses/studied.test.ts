import { describe, expect, it } from "vitest";

import { studiedCount, studiedLabel, studiedStatusLabel } from "./studied";

describe("studiedLabel", () => {
  it("escreve a data cheia da aula estudada", () => {
    expect(studiedLabel(new Date("2026-10-20T14:00:00-03:00"))).toBe(
      "20/10/2026",
    );
  });

  it("conta o dia no fuso de São Paulo, não no UTC", () => {
    // 2026-10-20T02:00Z é 2026-10-19T23:00 em São Paulo.
    expect(studiedLabel(new Date("2026-10-20T02:00:00Z"))).toBe("19/10/2026");
  });
});

describe("studiedCount", () => {
  it("conta só as aulas com data de estudo", () => {
    expect(
      studiedCount([
        { studiedOn: new Date("2026-10-20T14:00:00-03:00") },
        { studiedOn: null },
        { studiedOn: new Date("2026-10-21T14:00:00-03:00") },
      ]),
    ).toBe(2);
  });

  it("conta zero na lista vazia", () => {
    expect(studiedCount([])).toBe(0);
  });
});

describe("studiedStatusLabel", () => {
  const agora = new Date("2026-10-22T15:00:00-03:00");

  it("diz hoje em vez de repetir a data do dia", () => {
    expect(
      studiedStatusLabel(new Date("2026-10-22T09:00:00-03:00"), agora),
    ).toBe("Estudada hoje");
  });

  it("escreve a data quando foi noutro dia", () => {
    expect(
      studiedStatusLabel(new Date("2026-10-20T09:00:00-03:00"), agora),
    ).toBe("Estudada em 20/10/2026");
  });

  it("convida quando a aula ainda não foi estudada", () => {
    expect(studiedStatusLabel(null, agora)).toBe("Ainda não estudada");
  });
});
