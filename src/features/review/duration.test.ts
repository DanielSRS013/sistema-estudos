import { describe, expect, it } from "vitest";

import { durationLabel } from "./duration";

describe("durationLabel", () => {
  it("diz travessão quando não há mediana", () => {
    expect(durationLabel(null)).toBe("—");
  });

  it("mostra uma casa decimal abaixo de dez segundos", () => {
    expect(durationLabel(7_440)).toBe("7,4 s");
    expect(durationLabel(920)).toBe("0,9 s");
  });

  it("arredonda a casa decimal em vez de truncá-la", () => {
    expect(durationLabel(950)).toBe("1 s");
  });

  it("some com a casa decimal quando ela é zero", () => {
    expect(durationLabel(42_000)).toBe("42 s");
    expect(durationLabel(0)).toBe("0 s");
  });

  it("vira minutos a partir de um minuto", () => {
    expect(durationLabel(72_000)).toBe("1 min 12 s");
  });

  it("não produz sessenta segundos ao arredondar", () => {
    // 119,6 s arredonda para 120 s: dois minutos cravados, não "1 min 60 s".
    expect(durationLabel(119_600)).toBe("2 min");
  });

  it("recusa o que não é duração", () => {
    expect(durationLabel(-1)).toBe("—");
    expect(durationLabel(Number.NaN)).toBe("—");
  });
});
