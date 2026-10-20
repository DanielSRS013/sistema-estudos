import { describe, expect, it } from "vitest";

import { schedule, type CardState, type Rating } from "./scheduler";
import { revert } from "./undo";

const AGORA = new Date("2026-10-19T12:00:00Z");

const AVALIACOES: Rating[] = ["again", "hard", "good", "easy"];

const novo: CardState = {
  id: "c1",
  due: AGORA,
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  state: "new",
  lastReview: null,
};

const maduro: CardState = {
  id: "c2",
  due: new Date("2026-10-18T12:00:00Z"),
  stability: 17.3,
  difficulty: 6.1,
  elapsedDays: 9,
  scheduledDays: 10,
  learningSteps: 0,
  reps: 7,
  lapses: 2,
  state: "review",
  lastReview: new Date("2026-10-09T12:00:00Z"),
};

describe("revert", () => {
  it("devolve o card exatamente ao estado anterior, em qualquer avaliação", () => {
    for (const antes of [novo, maduro]) {
      for (const rating of AVALIACOES) {
        const { card: depois, log } = schedule(antes, rating, AGORA);

        expect(revert(depois, log)).toEqual(antes);
      }
    }
  });

  it("desfaz o lapso, não só o prazo", () => {
    const { card: depois, log } = schedule(maduro, "again", AGORA);

    expect(depois.lapses).toBe(3);
    expect(revert(depois, log).lapses).toBe(2);
  });

  it("devolve o card novo a `new`, sem última revisão", () => {
    const { card: depois, log } = schedule(novo, "good", AGORA);

    const voltou = revert(depois, log);

    expect(voltou.state).toBe("new");
    expect(voltou.reps).toBe(0);
    expect(voltou.lastReview).toBeNull();
  });

  it("sobrevive a duas avaliações seguidas, desfeitas na ordem inversa", () => {
    const primeira = schedule(maduro, "good", AGORA);
    const depois = new Date("2026-10-30T12:00:00Z");
    const segunda = schedule(primeira.card, "hard", depois);

    expect(revert(segunda.card, segunda.log)).toEqual(primeira.card);
    expect(revert(revert(segunda.card, segunda.log), primeira.log)).toEqual(
      maduro,
    );
  });

  it("é pura: não altera o card recebido", () => {
    const { card: depois, log } = schedule(maduro, "easy", AGORA);
    const copia = { ...depois };

    revert(depois, log);

    expect(depois).toEqual(copia);
  });
});
