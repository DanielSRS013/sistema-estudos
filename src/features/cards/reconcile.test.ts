import { describe, expect, it } from "vitest";

import { parse } from "./parser";
import {
  anchorKey,
  normalize,
  reconcile,
  similarity,
  type ExistingCard,
} from "./reconcile";

/** Card já no banco, com estado de FSRS que não pode se perder. */
function existente(partes: Partial<ExistingCard>): ExistingCard {
  return {
    id: "card-1",
    anchorKey: anchorKey(partes.prompt ?? "", partes.answer ?? ""),
    ordinal: 0,
    prompt: "",
    answer: "",
    hint: null,
    archivedAt: null,
    ...partes,
  };
}

describe("normalize", () => {
  it("colapsa espaços", () => {
    expect(normalize("a   b\n c")).toBe("a b c");
  });

  it("remove pontuação de borda", () => {
    expect(normalize("  — a capital é […].  ")).toBe("a capital é […]");
  });

  it("não mexe na pontuação do meio", () => {
    expect(normalize("f(x), g(x)")).toBe("f(x), g(x)");
  });
});

describe("anchorKey", () => {
  it("é estável para o mesmo texto", () => {
    expect(anchorKey("A capital é […]", "Brasília")).toBe(
      anchorKey("A capital é […]", "Brasília"),
    );
  });

  it("ignora diferença de espaço e pontuação de borda", () => {
    expect(anchorKey("A capital  é […].", "Brasília")).toBe(
      anchorKey("A capital é […]", "Brasília"),
    );
  });

  it("muda quando a resposta muda", () => {
    expect(anchorKey("A capital é […]", "Brasília")).not.toBe(
      anchorKey("A capital é […]", "Salvador"),
    );
  });

  it("não confunde o corte entre frente e verso", () => {
    expect(anchorKey("ab", "c")).not.toBe(anchorKey("a", "bc"));
  });

  it("tem 16 bytes em hexadecimal", () => {
    expect(anchorKey("x", "y")).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("similarity", () => {
  it("vale 1 para textos idênticos", () => {
    expect(similarity("abc", "abc")).toBe(1);
  });

  it("fica acima de 0,8 numa correção pequena", () => {
    expect(
      similarity(
        "A projeção escalar de s sobre r é […]",
        "A projeção escalar de s sobre r vale […]",
      ),
    ).toBeGreaterThanOrEqual(0.8);
  });

  it("fica abaixo de 0,8 em textos sem parentesco", () => {
    expect(
      similarity("A capital é […]", "O determinante de uma singular é […]"),
    ).toBeLessThan(0.8);
  });
});

describe("reconciliação", () => {
  it("mantém o card quando o texto não mudou", () => {
    const { cards } = parse("A capital é {{Brasília}}.");
    const antigo = existente({
      prompt: cards[0]!.prompt,
      answer: cards[0]!.answer,
    });

    const plano = reconcile([antigo], cards);

    expect(plano.update).toHaveLength(1);
    expect(plano.update[0]).toMatchObject({ id: "card-1", unarchive: false });
    expect(plano.create).toEqual([]);
    expect(plano.archive).toEqual([]);
  });

  it("editar o texto preserva o card — não cria outro nem arquiva o velho", () => {
    const { cards: antes } = parse(
      "A projeção escalar de s sobre r é {{s · r / |r|}}.",
    );
    const antigo = existente({
      prompt: antes[0]!.prompt,
      answer: antes[0]!.answer,
    });

    const { cards: depois } = parse(
      "A projeção escalar de s sobre r vale {{s · r / |r|}}.",
    );
    const plano = reconcile([antigo], depois);

    expect(plano.create).toEqual([]);
    expect(plano.archive).toEqual([]);
    expect(plano.update).toHaveLength(1);
    expect(plano.update[0]?.id).toBe("card-1");
    // a âncora acompanha o texto novo, senão o próximo save não reencontra
    expect(plano.update[0]?.anchorKey).toBe(
      anchorKey(depois[0]!.prompt, depois[0]!.answer),
    );
    expect(plano.update[0]?.prompt).toBe(depois[0]!.prompt);
  });

  it("apagar o trecho arquiva o card, e o plano não tem como apagá-lo", () => {
    const { cards } = parse("A capital é {{Brasília}}.");
    const antigo = existente({
      prompt: cards[0]!.prompt,
      answer: cards[0]!.answer,
    });

    const plano = reconcile([antigo], []);

    expect(plano.archive).toEqual(["card-1"]);
    expect(plano.create).toEqual([]);
    expect(plano.update).toEqual([]);
    expect(Object.keys(plano)).not.toContain("delete");
  });

  it("não re-arquiva quem já está arquivado", () => {
    const antigo = existente({
      prompt: "A capital é […]",
      answer: "Brasília",
      archivedAt: new Date("2026-10-01T12:00:00Z"),
    });

    expect(reconcile([antigo], []).archive).toEqual([]);
  });

  it("restaurar o trecho reativa o card em vez de criar um novo", () => {
    const { cards } = parse("A capital é {{Brasília}}.");
    const arquivado = existente({
      prompt: cards[0]!.prompt,
      answer: cards[0]!.answer,
      archivedAt: new Date("2026-10-01T12:00:00Z"),
    });

    const plano = reconcile([arquivado], cards);

    expect(plano.create).toEqual([]);
    expect(plano.update).toHaveLength(1);
    expect(plano.update[0]).toMatchObject({ id: "card-1", unarchive: true });
  });

  it("reordenar as lacunas não embaralha os estados", () => {
    const { cards: antes } = parse("Primeiro {{um}}.\n\nSegundo {{dois}}.");
    const existentes = [
      existente({
        id: "card-um",
        ordinal: 0,
        prompt: antes[0]!.prompt,
        answer: antes[0]!.answer,
      }),
      existente({
        id: "card-dois",
        ordinal: 1,
        prompt: antes[1]!.prompt,
        answer: antes[1]!.answer,
      }),
    ];

    const { cards: depois } = parse("Segundo {{dois}}.\n\nPrimeiro {{um}}.");
    const plano = reconcile(existentes, depois);

    expect(plano.create).toEqual([]);
    expect(plano.archive).toEqual([]);
    expect(
      plano.update.map((card) => [card.id, card.ordinal]).sort(),
    ).toEqual([
      ["card-dois", 0],
      ["card-um", 1],
    ]);
  });

  it("trecho novo vira card novo, com a âncora já calculada", () => {
    const { cards } = parse("Uma lacuna {{nova}}.");
    const plano = reconcile([], cards);

    expect(plano.update).toEqual([]);
    expect(plano.archive).toEqual([]);
    expect(plano.create).toHaveLength(1);
    expect(plano.create[0]).toMatchObject({
      anchorKey: anchorKey(cards[0]!.prompt, cards[0]!.answer),
      kind: "cloze",
      ordinal: 0,
    });
  });

  it("troca de verdade quando o texto mudou demais", () => {
    const antigo = existente({
      prompt: "A capital é […]",
      answer: "Brasília",
    });
    const { cards } = parse("O determinante de uma matriz singular é {{zero}}.");

    const plano = reconcile([antigo], cards);

    expect(plano.archive).toEqual(["card-1"]);
    expect(plano.create).toHaveLength(1);
    expect(plano.update).toEqual([]);
  });

  it("não deixa dois cards idênticos colidirem na mesma nota", () => {
    const { cards } = parse("Repetido {{igual}}.\n\nRepetido {{igual}}.");
    const plano = reconcile([], cards);

    expect(plano.create).toHaveLength(1);
    expect(plano.duplicates).toHaveLength(1);
    expect(plano.duplicates[0]?.ordinal).toBe(1);
  });
});
