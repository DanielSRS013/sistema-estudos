import { describe, expect, it } from "vitest";

// A contagem de linhas vive em global-setup.ts (uma vez por rodada). Não a
// repetimos aqui: a ordem entre arquivos não é garantida, e depois que um
// arquivo semeia o banco deixa de estar vazio, o que faria este teste falhar
// à toa. Resta a asserção que não depende de ordem.
describe("guarda do banco de teste", () => {
  it("roda num branch de teste, nunca na main", () => {
    expect(process.env.ESTUDOS_TEST_BRANCH).toMatch(/^teste-/);
  });
});
