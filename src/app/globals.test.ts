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

  it.each([
    ["--viridis-ink", "#16202b"],
    ["--viridis-paper", "#fcfcfa"],
  ])("fixa %s para o texto sobre as paradas", (token, hex) => {
    expect(css).toContain(`${token}: ${hex};`);
  });

  it("não deixa o texto sobre o viridis inverter com o tema", () => {
    // As quatro paradas não mudam no escuro; o texto por cima delas também
    // não pode mudar, ou "Fácil" vira texto claro sobre amarelo.
    const dark = css.slice(css.indexOf(".dark {"));
    for (const token of ["--viridis-ink", "--viridis-paper"]) {
      expect(dark).not.toContain(`${token}:`);
    }
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

describe("alternância de tema", () => {
  it("mantém a guarda que deixa a escolha do usuário vencer o sistema", () => {
    // O controle do rail escreve `.light` ou `.dark` no <html>. Sem esta
    // guarda, escolher o claro num sistema escuro não teria efeito.
    expect(css).toContain(":root:not(.light)");
  });

  it("casa a variante `dark:` do Tailwind com a classe que o script aplica", () => {
    expect(css).toContain("@custom-variant dark (&:where(.dark, .dark *));");
  });
});

describe("corpo da nota de SPEC.md §6", () => {
  const prose = css.slice(css.indexOf(".note-prose {"));

  it("usa a serif da superfamília Plex", () => {
    expect(prose).toContain("font-family: var(--font-plex-serif)");
  });

  it("fixa o corpo em 17px com entrelinha de 1,65", () => {
    expect(prose).toContain("font-size: var(--text-base);");
    expect(prose).toContain("line-height: 1.65;");
  });

  it("limita a medida da coluna de leitura", () => {
    expect(prose).toContain("max-width: var(--measure);");
  });

  it("empilha o editor em coluna única abaixo de 900px", () => {
    expect(css).toContain("--breakpoint-editor: 56.25rem;");
  });
});

describe("margem de cards de SPEC.md §6", () => {
  it("some abaixo de 1100px", () => {
    expect(css).toContain("--breakpoint-cards: 68.75rem;");
  });
});
