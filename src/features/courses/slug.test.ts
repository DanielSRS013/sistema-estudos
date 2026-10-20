import { describe, expect, it } from "vitest";

import { uniqueSlug } from "./slug";

describe("uniqueSlug", () => {
  it("usa o slug direto quando está livre", () => {
    expect(uniqueSlug("Linear Algebra", ["calculo"])).toBe("linear-algebra");
  });

  it("sufixa a partir de 2 quando colide", () => {
    expect(uniqueSlug("Cálculo", ["calculo"])).toBe("calculo-2");
    expect(uniqueSlug("Cálculo", ["calculo", "calculo-2"])).toBe("calculo-3");
  });

  it("pula buracos sem reusar slug tomado", () => {
    expect(uniqueSlug("Cálculo", ["calculo", "calculo-3"])).toBe("calculo-2");
  });

  it("cai em 'curso' quando o título não gera slug", () => {
    expect(uniqueSlug("±±±", [])).toBe("curso");
    expect(uniqueSlug("±±±", ["curso"])).toBe("curso-2");
  });
});
