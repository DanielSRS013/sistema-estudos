import { describe, expect, it } from "vitest";

import { resolveLimits } from "./limits";
import { DEFAULT_LIMITS } from "./scheduler";

describe("resolveLimits", () => {
  it("cai nos padrões do SPEC §4 quando não há linha gravada", () => {
    expect(resolveLimits(undefined)).toEqual({
      newPerDay: 20,
      reviewsPerDay: 200,
    });
    expect(resolveLimits(undefined)).toEqual(DEFAULT_LIMITS);
  });

  it("usa o que está gravado", () => {
    expect(resolveLimits({ newPerDay: 5, reviewsPerDay: 50 })).toEqual({
      newPerDay: 5,
      reviewsPerDay: 50,
    });
  });

  it("respeita zero em vez de tratar como ausente", () => {
    expect(resolveLimits({ newPerDay: 0, reviewsPerDay: 0 })).toEqual({
      newPerDay: 0,
      reviewsPerDay: 0,
    });
  });
});
