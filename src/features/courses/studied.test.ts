import { describe, expect, it } from "vitest";

import { studiedLabel } from "./studied";

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
