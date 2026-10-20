import { describe, expect, it } from "vitest";

import {
  DEFAULT_LIMITS,
  queueFor,
  schedule,
  type CardState,
  type Rating,
} from "./scheduler";

const AGORA = new Date("2026-10-19T12:00:00Z");

function card(partes: Partial<CardState> & { id: string }): CardState {
  return {
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
    ...partes,
  };
}

/** Card já maduro, para exercitar lapso e intervalos longos. */
function maduro(id: string, vencidoEmDias: number): CardState {
  return card({
    id,
    state: "review",
    due: new Date(AGORA.getTime() - vencidoEmDias * 86_400_000),
    lastReview: new Date(AGORA.getTime() - 10 * 86_400_000),
    stability: 12,
    difficulty: 5,
    scheduledDays: 10,
    elapsedDays: 10,
    reps: 4,
    lapses: 1,
  });
}

const AVALIACOES: Rating[] = ["again", "hard", "good", "easy"];

describe("schedule", () => {
  it("atende às quatro avaliações, adiando o card e contando a repetição", () => {
    for (const rating of AVALIACOES) {
      const { card: depois, log } = schedule(card({ id: "c1" }), rating, AGORA);

      expect(log.rating).toBe(rating);
      expect(depois.id).toBe("c1");
      expect(depois.reps).toBe(1);
      expect(depois.state).not.toBe("new");
      expect(depois.due.getTime()).toBeGreaterThan(AGORA.getTime());
      expect(depois.lastReview).toEqual(AGORA);
    }
  });

  it("ordena os intervalos: Again adia menos que Good, que adia menos que Easy", () => {
    const base = maduro("c1", 0);
    const prazo = (rating: Rating) =>
      schedule(base, rating, AGORA).card.due.getTime();

    expect(prazo("again")).toBeLessThan(prazo("hard"));
    expect(prazo("hard")).toBeLessThan(prazo("good"));
    expect(prazo("good")).toBeLessThan(prazo("easy"));
  });

  it("conta lapso quando Again derruba um card que estava em revisão", () => {
    const antes = maduro("c1", 1);
    const { card: depois } = schedule(antes, "again", AGORA);

    expect(depois.lapses).toBe(antes.lapses + 1);
    expect(depois.reps).toBe(antes.reps + 1);
    expect(depois.state).toBe("relearning");
  });

  it("não conta lapso em Good", () => {
    const antes = maduro("c1", 1);

    expect(schedule(antes, "good", AGORA).card.lapses).toBe(antes.lapses);
  });

  it("carrega no log o estado anterior inteiro — é o que o desfazer lê", () => {
    const antes = maduro("c1", 3);
    const { card: depois, log } = schedule(antes, "hard", AGORA);

    expect(log).toMatchObject({
      rating: "hard",
      stateBefore: antes.state,
      stabilityBefore: antes.stability,
      difficultyBefore: antes.difficulty,
      dueBefore: antes.due,
      lastReviewBefore: antes.lastReview,
      repsBefore: antes.reps,
      lapsesBefore: antes.lapses,
    });
    expect(log.dueAfter).toEqual(depois.due);
    expect(log.scheduledDays).toBe(depois.scheduledDays);
  });

  it("é pura: não altera o card recebido", () => {
    const antes = maduro("c1", 2);
    const copia = { ...antes };

    schedule(antes, "easy", AGORA);

    expect(antes).toEqual(copia);
  });
});

describe("queueFor", () => {
  const limites = { newPerDay: 20, reviewsPerDay: 200 };

  it("põe os vencidos antes dos novos, do mais antigo para o mais recente", () => {
    const fila = queueFor(
      [
        card({ id: "novo" }),
        maduro("venceu-ontem", 1),
        maduro("venceu-semana", 7),
      ],
      AGORA,
      limites,
    );

    expect(fila.map((c) => c.id)).toEqual([
      "venceu-semana",
      "venceu-ontem",
      "novo",
    ]);
  });

  it("deixa fora o que ainda não venceu", () => {
    const fila = queueFor(
      [maduro("vence-amanha", -1), maduro("venceu", 1)],
      AGORA,
      limites,
    );

    expect(fila.map((c) => c.id)).toEqual(["venceu"]);
  });

  it("inclui o que vence ainda hoje, mais tarde — a fila é do dia, não do instante", () => {
    const hojeMaisTarde = card({
      id: "hoje-23h",
      state: "learning",
      due: new Date("2026-10-19T23:00:00Z"),
      reps: 1,
    });

    expect(queueFor([hojeMaisTarde], AGORA, limites).map((c) => c.id)).toEqual([
      "hoje-23h",
    ]);
  });

  it("corta os novos no limite do dia", () => {
    const novos = Array.from({ length: 5 }, (_, i) => card({ id: `n${i}` }));

    const fila = queueFor(novos, AGORA, { newPerDay: 2, reviewsPerDay: 200 });

    expect(fila.map((c) => c.id)).toEqual(["n0", "n1"]);
  });

  it("corta as revisões no limite do dia, mantendo as mais antigas", () => {
    const vencidos = [maduro("v1", 1), maduro("v2", 5), maduro("v3", 9)];

    const fila = queueFor(vencidos, AGORA, { newPerDay: 20, reviewsPerDay: 2 });

    expect(fila.map((c) => c.id)).toEqual(["v3", "v2"]);
  });

  it("trata limite zero ou negativo como fila vazia daquele tipo", () => {
    const fila = queueFor(
      [maduro("v1", 1), card({ id: "novo" })],
      AGORA,
      { newPerDay: 0, reviewsPerDay: -3 },
    );

    expect(fila).toEqual([]);
  });

  it("usa 20 novos e 200 revisões como padrão", () => {
    expect(DEFAULT_LIMITS).toEqual({ newPerDay: 20, reviewsPerDay: 200 });
  });
});
