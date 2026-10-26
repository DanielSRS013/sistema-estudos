import { describe, expect, it } from "vitest";

import { CLASSE_ITEM_RODAPE } from "./rail-item";

/*
 * Teste de string sobre classes Tailwind: é frágil a refatoração de propósito.
 * Ele protege o alvo de toque do SPEC §6 — abaixo de 900px o rail é a barra do
 * topo e todo item precisa de 44px (`min-h-11`) — e o reset `rail:min-h-0` para
 * quando o rail vira coluna e o alvo volta ao padding do handoff. Se uma
 * refatoração de Tailwind exigir mudar estas classes, preserve os dois
 * comportamentos em vez de apagar o teste.
 */
describe("CLASSE_ITEM_RODAPE", () => {
  it("garante o alvo de 44px abaixo de 900px (SPEC §6)", () => {
    expect(CLASSE_ITEM_RODAPE.split(" ")).toContain("min-h-11");
  });

  it("zera o alvo mínimo quando o rail é coluna", () => {
    expect(CLASSE_ITEM_RODAPE.split(" ")).toContain("rail:min-h-0");
  });
});
