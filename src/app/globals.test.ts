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

  // Os três tons ajustados por contraste no escuro passavam livres: o teste
  // só cobria --paper e --ink, e os valores tinham derivado do handoff.
  it.each([
    ["--ink-soft", "#93a3b2"],
    ["--rule", "#2a353f"],
    ["--accent", "#6fa4cc"],
  ])("ajusta %s para %s no escuro", (token, hex) => {
    const dark = css.slice(css.indexOf(".dark {"));
    expect(dark).toContain(`${token}: ${hex};`);
    // o bloco de `prefers-color-scheme` repete os mesmos valores
    const consultas = dark.split(`${token}: ${hex};`).length - 1;
    expect(consultas).toBe(2);
  });

  it("não guarda cor de erro: fora do viridis nenhuma cor informa", () => {
    // O desenho não tem token de erro. Erro se diz por marcação e texto —
    // borda, `role="alert"` e a frase —, nunca por vermelho.
    expect(css).not.toContain("--destructive:");
    expect(css).not.toContain("--color-destructive:");
  });

  it("não aliasa as paradas do viridis como paleta de gráfico", () => {
    // `--chart-*` reaproveitava o viridis em decoração, contra a própria
    // regra escrita duas linhas acima dos tokens, e inventava um sexto tom.
    expect(css).not.toMatch(/--chart-\d:/);
    expect(css).not.toMatch(/--color-chart-\d:/);
    expect(css).not.toContain("#1f9e89");
  });
});

describe("raio e quebra de linha", () => {
  it("usa um raio de 2px", () => {
    expect(css).toContain("--radius: 0.125rem;");
  });

  it("aponta os cinco nomes do registry para o mesmo raio", () => {
    // `rounded-sm` e `rounded-xl` não podem abrir hierarquia que o desenho
    // não tem.
    for (const nome of ["sm", "md", "lg", "xl", "2xl"]) {
      expect(css).toContain(`--radius-${nome}: var(--radius);`);
    }
  });

  it("quebra palavra longa na raiz em vez de rolar a página", () => {
    expect(css).toContain("overflow-wrap: anywhere;");
  });
});

describe("escala tipográfica de SPEC.md §6", () => {
  it("fecha a escala apagando os degraus de fábrica do Tailwind", () => {
    // Sem o reset, `text-xl` resolve 20px e `text-3xl` 30px: dois tamanhos
    // fora de 13/15/17/21/28/38, disponíveis por acidente.
    expect(css).toContain("--text-*: initial;");
  });

  it.each([
    ["--text-xs", "0.8125rem"],
    ["--text-sm", "0.9375rem"],
    ["--text-base", "1.0625rem"],
    ["--text-lg", "1.3125rem"],
    ["--text-xl", "1.75rem"],
    ["--text-2xl", "2.375rem"],
  ])("define %s como %s", (token, valor) => {
    expect(css).toContain(`${token}: ${valor};`);
  });

  it("não define degrau nenhum fora dos seis", () => {
    const degraus = [...css.matchAll(/--text-([a-z0-9]+):/g)].map((m) => m[1]);
    expect(new Set(degraus)).toEqual(
      new Set(["xs", "sm", "base", "lg", "xl", "2xl"]),
    );
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

  it("mantém o cabeçalho da nota na serif, junto do corpo", () => {
    const titulos = prose.slice(prose.indexOf(".note-prose h1,"));
    expect(titulos.slice(0, 200)).toContain(
      "font-family: var(--font-plex-serif)",
    );
  });

  it("dá ao bloco de código Mono 15px com entrelinha 1,6 e sem fundo", () => {
    const pre = prose.slice(prose.indexOf(".note-prose pre {"));
    const bloco = pre.slice(0, pre.indexOf("}"));
    expect(bloco).toContain("font-size: var(--text-sm);");
    expect(bloco).toContain("line-height: 1.6;");
    expect(bloco).toContain("background-color: transparent;");
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
