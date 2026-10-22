import { describe, expect, it } from "vitest";

import { cardKindLabel, cardStateLabel, dueLabel } from "./labels";

describe("tipo do card", () => {
  it.each([
    ["cloze", "Lacuna"],
    ["qa", "Pergunta"],
  ] as const)("escreve %s como %s", (kind, rotulo) => {
    expect(cardKindLabel(kind)).toBe(rotulo);
  });
});

describe("estado do card", () => {
  it.each([
    ["new", "novo"],
    ["learning", "aprendendo"],
    ["review", "revisão"],
  ] as const)("escreve %s como %s", (state, rotulo) => {
    expect(cardStateLabel({ state, suspended: false })).toBe(rotulo);
  });

  // O handoff lista quatro estados — novo, aprendendo, revisão, suspenso — e
  // "reaprendendo" não está entre eles: o FSRS distingue, a tela não.
  it("escreve relearning como aprendendo", () => {
    expect(cardStateLabel({ state: "relearning", suspended: false })).toBe(
      "aprendendo",
    );
  });

  it("deixa suspenso vencer o estado do FSRS", () => {
    // Suspenso não ganha badge extra: ele ocupa o badge do estado, como no
    // handoff, e é por isso que a face vai para `--ink-soft`.
    expect(cardStateLabel({ state: "review", suspended: true })).toBe(
      "suspenso",
    );
  });
});

describe("vencimento do card", () => {
  const agora = new Date("2026-10-22T15:00:00-03:00");

  it("não fala de data em card suspenso", () => {
    // O handoff escreve "Suspenso desde 12 out." e `cards.suspendedAt` não
    // existe — a Fatia 9 fixou que suspender não grava nada. A data cai.
    expect(
      dueLabel(
        { due: new Date("2026-10-25T12:00:00Z"), reps: 6, suspended: true },
        agora,
      ),
    ).toBe("Suspenso");
  });

  it("diz que ainda não foi revisado quando não há revisão nenhuma", () => {
    expect(
      dueLabel(
        { due: new Date("2026-10-22T12:00:00Z"), reps: 0, suspended: false },
        agora,
      ),
    ).toBe("Ainda não revisado");
  });

  it("conta os dias até o vencimento e as revisões feitas", () => {
    expect(
      dueLabel(
        { due: new Date("2026-10-25T12:00:00Z"), reps: 6, suspended: false },
        agora,
      ),
    ).toBe("Vence em 3 dias · 6 revisões");
  });

  it("escreve um dia e uma revisão no singular", () => {
    expect(
      dueLabel(
        { due: new Date("2026-10-23T12:00:00Z"), reps: 1, suspended: false },
        agora,
      ),
    ).toBe("Vence em 1 dia · 1 revisão");
  });

  it("diz hoje para o que vence dentro do dia lógico", () => {
    expect(
      dueLabel(
        { due: new Date("2026-10-22T23:00:00-03:00"), reps: 2, suspended: false },
        agora,
      ),
    ).toBe("Vence hoje · 2 revisões");
  });

  it("diz hoje para o que já venceu — é o que a fila de hoje faz com ele", () => {
    expect(
      dueLabel(
        { due: new Date("2026-10-01T12:00:00Z"), reps: 4, suspended: false },
        agora,
      ),
    ).toBe("Vence hoje · 4 revisões");
  });

  it("não inventa revisão em card já agendado sem reps", () => {
    // Card suspenso e retomado antes da primeira revisão: `due` no futuro,
    // `reps` zero. Quem manda é o `reps`.
    expect(
      dueLabel(
        { due: new Date("2026-10-30T12:00:00Z"), reps: 0, suspended: false },
        agora,
      ),
    ).toBe("Ainda não revisado");
  });
});
