import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// `shadcn` reescreve globals.css quando é reinicializado ou quando um
// componente novo traz tokens. Este teste trava os valores de SPEC.md §6
// para que a paleta não seja sobrescrita em silêncio.
const css = readFileSync(join(import.meta.dirname, "globals.css"), "utf8");

describe("tokens de SPEC.md §6", () => {
  it.each([
    ["--paper", "#fcfcfa"],
    ["--ink", "#16202b"],
    ["--ink-soft", "#5a6b7b"],
    ["--rule", "#dde3e8"],
    ["--accent", "#31688e"],
  ])("define %s como %s", (token, hex) => {
    expect(css).toContain(`${token}: ${hex};`);
  });

  it.each([
    ["--again", "#440154"],
    ["--hard", "#31688e"],
    ["--good", "#35b779"],
    ["--easy", "#fde725"],
  ])("preserva a parada %s do viridis em %s", (token, hex) => {
    expect(css).toContain(`${token}: ${hex};`);
  });

  it("inverte paper e ink no modo escuro mantendo o viridis", () => {
    expect(css).toContain("--paper: #11171d;");
    expect(css).toContain("--ink: #e8edf1;");
    // nenhuma parada do viridis é redefinida dentro de .dark
    const dark = css.slice(css.indexOf(".dark {"));
    for (const token of ["--again", "--hard", "--good", "--easy"]) {
      expect(dark).not.toContain(`${token}:`);
    }
  });
});
