import { describe, expect, it } from "vitest";

import { noteEditedLabel, noteLineMeta } from "./edited";

describe("última edição no meta da leitura", () => {
  const agora = new Date("2026-10-22T15:00:00-03:00");

  it("escreve o intervalo recente sem preposição", () => {
    expect(noteEditedLabel(new Date("2026-10-22T13:00:00-03:00"), agora)).toBe(
      "Editada há 2 h",
    );
  });

  it("escreve o instante mesmo", () => {
    expect(noteEditedLabel(new Date("2026-10-22T14:59:50-03:00"), agora)).toBe(
      "Editada agora",
    );
  });

  it("escreve ontem e o dia da semana como advérbio", () => {
    expect(noteEditedLabel(new Date("2026-10-21T10:00:00-03:00"), agora)).toBe(
      "Editada ontem",
    );
    expect(noteEditedLabel(new Date("2026-10-17T10:00:00-03:00"), agora)).toBe(
      "Editada sáb.",
    );
  });

  it("põe a preposição antes da data cheia", () => {
    // "Editada 14/10" não é português; "Editada em 14/10" é.
    expect(noteEditedLabel(new Date("2026-10-10T10:00:00-03:00"), agora)).toBe(
      "Editada em 10/10",
    );
    expect(noteEditedLabel(new Date("2025-12-31T10:00:00-03:00"), agora)).toBe(
      "Editada em 31/12/2025",
    );
  });
});

describe("meta da nota na linha da aula", () => {
  const agora = new Date("2026-10-22T15:00:00-03:00");

  it("junta cards e última edição", () => {
    expect(noteLineMeta(4, new Date("2026-10-22T13:00:00-03:00"), agora)).toBe(
      "4 cards · editada há 2 h",
    );
  });

  it("concorda no singular e mantém a preposição da data", () => {
    expect(noteLineMeta(1, new Date("2026-10-10T10:00:00-03:00"), agora)).toBe(
      "1 card · editada em 10/10",
    );
  });

  it("diz que a nota ainda não gerou card", () => {
    expect(noteLineMeta(0, new Date("2026-10-21T10:00:00-03:00"), agora)).toBe(
      "Sem cards · editada ontem",
    );
  });
});
