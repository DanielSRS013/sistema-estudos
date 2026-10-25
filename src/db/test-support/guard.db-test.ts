import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { cards, notes, reviews } from "@/db/schema";

// A contagem zero também é pré-condição do setup.ts (recusa a rodada antes de
// qualquer teste). Fica aqui como prova explícita e legível da invariante.
describe("guarda do banco de teste", () => {
  it("roda num branch de teste, nunca na main", () => {
    expect(process.env.ESTUDOS_TEST_BRANCH).toMatch(/^teste-/);
  });

  it("começa sem nenhuma nota, card ou revisão", async () => {
    const [n, c, r] = await Promise.all([
      db.select().from(notes),
      db.select().from(cards),
      db.select().from(reviews),
    ]);

    expect([n.length, c.length, r.length]).toEqual([0, 0, 0]);
  });
});
