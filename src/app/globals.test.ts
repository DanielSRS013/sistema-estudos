import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// `shadcn` reescreve globals.css quando é reinicializado ou quando um
// componente novo traz tokens. Este teste trava os valores de SPEC.md §6
// para que a paleta não seja sobrescrita em silêncio.
const css = readFileSync(join(import.meta.dirname, "globals.css"), "utf8");

const raiz = join(import.meta.dirname, "..");

// Os pares [caminho relativo, conteúdo] de todo `.ts`/`.tsx` de fonte sob as
// pastas pedidas. Teste fica de fora: ele cita as próprias agulhas que proíbe.
function arquivosDeFonte(pastas: readonly string[]): [string, string][] {
  return pastas.flatMap((pasta) =>
    readdirSync(join(raiz, pasta), { withFileTypes: true, recursive: true })
      .filter(
        (entrada) =>
          entrada.isFile() &&
          /\.tsx?$/.test(entrada.name) &&
          !/\.test\.tsx?$/.test(entrada.name),
      )
      .map((entrada): [string, string] => {
        const caminho = join(entrada.parentPath, entrada.name);
        return [caminho.slice(raiz.length + 1), readFileSync(caminho, "utf8")];
      }),
  );
}

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
    // O token tem nome de faixa, não de consumidor: desde a casca do handoff
    // os mesmos 900px decidem o rail e as duas colunas do editor.
    expect(css).toContain("--breakpoint-rail: 56.25rem;");
  });
});

describe("margem de cards de SPEC.md §6", () => {
  it("some abaixo de 1100px", () => {
    expect(css).toContain("--breakpoint-cards: 68.75rem;");
  });
});

describe("um idioma de foco só", () => {
  it("fixa o foco global em filete sólido de 2px no accent", () => {
    // O handoff tem uma receita de foco e só uma. O anel de 30% de alpha que
    // vivia nos componentes ficava perto de 1,3:1 contra o papel.
    const regra = css.slice(css.indexOf(":focus-visible {"));
    expect(regra.slice(0, regra.indexOf("}"))).toContain(
      "outline: 2px solid var(--accent);",
    );
    expect(regra.slice(0, regra.indexOf("}"))).toContain(
      "outline-offset: 2px;",
    );
  });

  it("não reintroduz o anel de meia opacidade do registry", () => {
    // `@apply outline-ring/50` no seletor universal era o terceiro idioma.
    expect(css).not.toContain("outline-ring");
  });
});

describe("nenhuma receita de foco nos componentes", () => {
  it("não deixa `focus-visible:` em nenhum arquivo de `src`", () => {
    // Inclui `src/shared/ui`: a saída do registry do shadcn é justamente o
    // lugar por onde o anel fraco volta quando um componente novo é gerado.
    const comFoco = arquivosDeFonte(["app", "features", "shared"])
      .filter(([, texto]) => texto.includes("focus-visible:"))
      .map(([caminho]) => caminho);
    expect(comFoco).toEqual([]);
  });

  it("não deixa nenhum componente apagar o filete global", () => {
    // Metade do que o registry traz de volta não tem `focus-visible:` nenhum:
    // `input.tsx` chega com `outline-none` na string base. Utilitário vence
    // `@layer base` por ordem de camada — não por especificidade, as duas são
    // 0,1,0 —, então o filete some de todo campo, com a suíte verde.
    const apagadores = /outline-none|outline-hidden|outline-0\b|outline-\[|outline:\s*none/;
    const comApagador = arquivosDeFonte(["app", "features", "shared"])
      .filter(([, texto]) => apagadores.test(texto))
      .map(([caminho]) => caminho);
    expect(comApagador).toEqual([]);
  });

  it("não deixa `destructive` no botão do registry", () => {
    // `--destructive` saiu dos tokens na Fatia 12; a variante e as cadeias
    // `aria-invalid:` ficaram apontando para token que não existe.
    const botao = readFileSync(
      join(import.meta.dirname, "..", "shared", "ui", "button.tsx"),
      "utf8",
    );
    expect(botao).not.toContain("destructive");
    expect(botao).not.toContain("aria-invalid");
  });

  it("não deixa o botão do registry reintroduzir movimento", () => {
    // SPEC §6: movimento só responde a ação do usuário. O registry devolve
    // `transition-all` e um salto de 1px no `:active` toda vez que o
    // componente é regerado.
    const botao = readFileSync(join(raiz, "shared", "ui", "button.tsx"), "utf8");
    expect(botao).not.toContain("transition-all");
    expect(botao).not.toContain("translate-y-px");
  });

  it("não reimporta a biblioteca de animação", () => {
    // Zero classes `animate-*` em `src`; o import só volta junto com elas.
    expect(css).not.toContain("tw-animate-css");
  });
});

describe("nenhum valor arbitrário de tipografia ou cor", () => {
  // A escala tem seis degraus com nome desde a Fatia 12 e a entrelinha de
  // corpo tem utilitário: pixel escrito à mão em `className` não tem desculpa.
  // Medida de layout fora da escala do Tailwind continua permitida — o lugar
  // dela é `globals.css`, e as Fatias 19 e 22 precisam de 248/680/760/880px.
  it.each([
    ["text-[", "tamanho de fonte"],
    ["leading-[", "entrelinha"],
  ])("não escreve %s à mão (%s)", (agulha) => {
    const comValor = arquivosDeFonte(["app", "features"])
      .filter(([, texto]) => texto.includes(agulha))
      .map(([caminho]) => caminho);
    expect(comValor).toEqual([]);
  });

  it("não escreve hex cru de cor", () => {
    // Varre o arquivo inteiro, como as duas travas acima. Casar só o atributo
    // `className=` deixava passar os dois formatos mais comuns do repo —
    // `cn(buttonVariants({ size: "sm" }), "bg-[#ff0000]")`, onde o casamento
    // parava no primeiro `}`, e a constante de módulo, que não tem
    // `className=`. Três, quatro, seis ou oito dígitos: a âncora `#c1` de
    // cloze não casa.
    const hex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
    const comHex = arquivosDeFonte(["app", "features"])
      .filter(([, texto]) => hex.test(texto))
      .map(([caminho]) => caminho);
    expect(comHex).toEqual([]);
  });
});

describe("entrelinha com nome", () => {
  it("dá nome à entrelinha do corpo de nota", () => {
    // 1,65 aparecia escrito à mão em doze linhas, sempre no mesmo parágrafo
    // serif em `--ink-soft`.
    expect(css).toContain("--leading-prose: 1.65;");
  });

  it("fixa a face do card em 1,45, como SPEC §6", () => {
    const face = css.slice(css.indexOf(".card-face {"));
    expect(face.slice(0, face.indexOf("}"))).toContain("line-height: 1.45;");
  });
});

describe("a casca do handoff", () => {
  const shell = readFileSync(join(raiz, "shared", "shell.tsx"), "utf8");
  const rail = readFileSync(
    join(raiz, "features", "courses", "components", "rail.tsx"),
    "utf8",
  );

  it("decide layout nos 900px do handoff, não no `md:` do Tailwind", () => {
    // Entre 768 e 900 havia rail de 256px ao lado da coluna — faixa que a
    // §6 não pede.
    for (const arquivo of [shell, rail]) {
      expect(arquivo).not.toMatch(/\bmd:/);
      expect(arquivo).not.toMatch(/\b(sm|lg|xl):/);
    }
  });

  it("dá ao rail as três larguras do handoff", () => {
    // 240px em ≥1100, 200px entre 900 e 1099, 48px recolhido.
    expect(rail).toContain("rail:w-50");
    expect(rail).toContain("cards:w-60");
    expect(rail).toContain("rail:w-12");
  });

  it("mantém o fallback do Suspense na largura do rail", () => {
    // O fallback é o que o servidor pinta antes da árvore chegar: numa
    // largura diferente, a coluna salta quando o rail aparece.
    expect(shell).toContain("rail:w-50");
    expect(shell).toContain("cards:w-60");
  });

  it.each([
    ["px-4 pt-5 pb-14", "20/16/56 abaixo de 900"],
    ["rail:px-8 rail:pt-8 rail:pb-16", "32/32/64 entre 900 e 1099"],
    ["cards:px-14 cards:pt-10 cards:pb-20", "40/56/80 em ≥1100"],
  ])("dá ao conteúdo o degrau %s (%s)", (degrau) => {
    expect(shell).toContain(degrau);
  });

  it("não deixa ícone de biblioteca no rail", () => {
    // O handoff proíbe ícone decorativo: os glifos » ▾ ▸ são texto.
    expect(rail).not.toContain("lucide-react");
    for (const glifo of ["»", "▾", "▸"]) {
      expect(rail).toContain(glifo);
    }
  });

  it("espelha no rail as duas medidas de breakpoint do CSS", () => {
    // Só o default do rail no editor entre 900 e 1099px precisa da faixa em
    // JS. As duas strings de `matchMedia` não podem derivar dos tokens.
    for (const token of ["--breakpoint-rail", "--breakpoint-cards"]) {
      const valor = new RegExp(`${token}: ([0-9.]+rem);`).exec(css)?.[1];
      expect(valor).toBeDefined();
      expect(rail).toContain(`(min-width: ${valor})`);
    }
  });
});
