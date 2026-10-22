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

describe("a lacuna do cloze no modo foco", () => {
  const face = css.slice(css.indexOf(".card-face .cloze-oculta {"));

  it("desenha a lacuna oculta como filete de 2px, não como texto solto", () => {
    // O parser entrega `[…]` como texto puro; o filete só existe porque o
    // render envolve a marca num `span`. Se esta regra sair, o cloze fica
    // indistinguível do resto da frase e a suíte continua verde.
    const oculta = face.slice(0, face.indexOf("}"));
    expect(oculta).toContain("border-bottom: 2px solid var(--ink);");
    expect(oculta).toContain("padding: 0 0.5rem;");
  });

  it("revela a resposta in-loco com o mesmo fundo do destaque de busca", () => {
    const revelada = face.slice(face.indexOf(".card-face .cloze-revelada {"));
    expect(revelada.slice(0, revelada.indexOf("}"))).toContain(
      "background-color: var(--rule);",
    );
  });
});

describe("margem de cards de SPEC.md §6", () => {
  it("some abaixo de 1100px", () => {
    expect(css).toContain("--breakpoint-cards: 68.75rem;");
  });
});

describe("a grade da leitura da nota", () => {
  const grade = css.slice(css.indexOf(".note-grid {"));

  it("dá as duas colunas do handoff, 68ch e 248px", () => {
    // 248, não 256: a margem tem a largura que o handoff desenha, e não o
    // `w-64` que estava na página.
    expect(grade).toContain(
      "grid-template-columns: minmax(0, var(--measure)) 248px;",
    );
    expect(grade).toContain("column-gap: 48px;");
  });

  it("alinha as linhas pelo topo, para o card acompanhar o trecho", () => {
    expect(grade.slice(0, grade.indexOf("}"))).toContain(
      "align-items: start;",
    );
  });

  it("abre a largura total sem mexer na medida da leitura", () => {
    // A coluna de texto continua 68ch; o que cresce é a caixa, pelos 248 da
    // margem mais os 48 do intervalo.
    expect(grade).toContain("max-width: calc(var(--measure) + 296px);");
  });

  it("esconde a margem por padrão e a mostra só acima de 1100px", () => {
    // Sem isso a margem apareceria embaixo do texto a 375px, em cima da seção
    // recolhível que mostra os mesmos cards.
    const margem = css.slice(css.indexOf(".note-cards {"));
    expect(margem.slice(0, margem.indexOf("}"))).toContain("display: none;");
    expect(grade).toContain("@media (min-width: 68.75rem)");
  });

  it("dá à margem o respiro e o intervalo do handoff", () => {
    const coluna = grade.slice(grade.indexOf(".note-grid > .note-cards {"));
    const regra = coluna.slice(0, coluna.indexOf("}"));
    expect(regra).toContain("grid-column: 2;");
    expect(regra).toContain("padding-top: 28px;");
    expect(regra).toContain("gap: 12px;");
  });

  it("reparte a seção de cards a partir de 240px por card", () => {
    const lista = css.slice(css.indexOf(".note-cards-lista {"));
    expect(lista.slice(0, lista.indexOf("}"))).toContain(
      "grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));",
    );
  });
});

describe("o card da margem de NoteCard.dc.html", () => {
  const cards = arquivosDeFonte(["features/cards"]);

  it("não deixa o card herdar a serif do corpo da nota", () => {
    // A caixa do card é filha de `.note-prose` na margem e filha do `body` na
    // seção de baixo: sem família própria, o mesmo card sai em serif numa
    // largura e em sans na outra. `NoteCard.dc.html` põe a sans no `article` e
    // guarda a serif para a face.
    const caixa = readFileSync(
      join(raiz, "features", "cards", "components", "note-card.tsx"),
      "utf8",
    );
    expect(caixa).toContain("font-sans");
  });

  it("tira o fundo do código dentro da face do card", () => {
    // `.note-prose code` tem fundo `--muted` e padding; na face do card o
    // handoff pede Mono sem fundo, e a margem está dentro de `.note-prose`.
    const face = css.slice(css.indexOf(".card-face code {"));
    const regra = face.slice(0, face.indexOf("}"));
    expect(regra).toContain("background: none;");
    expect(regra).toContain("padding: 0;");
  });

  it("não volta a dizer o vínculo com o trecho por opacidade", () => {
    // A Fatia 11 apagava a 50% o card fora da viewport; o handoff resolve por
    // posição na grade. Opacidade de novo aqui seria dois idiomas para a mesma
    // informação — e o apagado passaria por card suspenso.
    const comOpacidade = cards
      .filter(([, texto]) => /opacity-/.test(texto))
      .map(([caminho]) => caminho);
    expect(comOpacidade).toEqual([]);
  });

  it("não volta a esconder os cards num `details`, que não anuncia estado", () => {
    // `<summary>` não emite `aria-expanded`; o handoff pede botão com ▸/▾.
    const comDetails = cards
      .filter(([, texto]) => texto.includes("<details"))
      .map(([caminho]) => caminho);
    expect(comDetails).toEqual([]);
  });

  it("fixa a face em Serif 15 com entrelinha 1,5", () => {
    const face = css.slice(css.indexOf(".note-card-face {"));
    const regra = face.slice(0, face.indexOf("}"));
    expect(regra).toContain("font-size: var(--text-sm);");
    expect(regra).toContain("line-height: 1.5;");
  });

  it("recua a face do card suspenso em vez de pintá-la", () => {
    const suspensa = css.slice(css.indexOf(".note-card-face.suspensa {"));
    expect(suspensa.slice(0, suspensa.indexOf("}"))).toContain(
      "color: var(--ink-soft);",
    );
  });
});

describe("a lacuna e o par no corpo da nota", () => {
  it("sublinha a lacuna com pontilhado de 1px, não com o filete do modo foco", () => {
    // No corpo a resposta está à vista: o traço diz "este trecho virou card",
    // e não "aqui falta uma palavra".
    const cloze = css.slice(css.indexOf(".note-prose .note-cloze {"));
    expect(cloze.slice(0, cloze.indexOf("}"))).toContain(
      "border-bottom: 1px dotted var(--ink-soft);",
    );
  });

  it("põe o número do card em sobrescrito, na Sans de 13px", () => {
    const ref = css.slice(css.indexOf(".note-prose .note-ref {"));
    const regra = ref.slice(0, ref.indexOf("}"));
    expect(regra).toContain("vertical-align: super;");
    expect(regra).toContain("font-size: var(--text-xs);");
  });

  it("cerca o bloco Pergunta/Resposta com os dois filetes", () => {
    const qa = css.slice(css.indexOf(".note-prose .note-qa {"));
    const regra = qa.slice(0, qa.indexOf("}"));
    expect(regra).toContain("border-top: 1px solid var(--rule);");
    expect(regra).toContain("border-bottom: 1px solid var(--rule);");
    expect(regra).toContain("grid-template-columns: auto minmax(0, 1fr);");
  });
});

describe("fórmula em display e realce de código", () => {
  it("alinha a fórmula à esquerda com recuo de 24px", () => {
    // O KaTeX centraliza por padrão, e fórmula centrada no meio de texto
    // alinhado à esquerda abre um buraco no parágrafo.
    const display = css.slice(css.indexOf(".note-prose .katex-display {"));
    const regra = display.slice(0, display.indexOf("}"));
    expect(regra).toContain("text-align: left;");
    expect(regra).toContain("padding-left: 1.5rem;");
  });

  it("realça o código em dois tons, sem cor nenhuma", () => {
    // As quatro classes do realce só podem usar `--ink` e `--ink-soft`: o
    // viridis é dos botões de avaliação.
    const realce = css.slice(css.indexOf(".note-prose pre .cod-comentario"));
    expect(realce).toContain("color: var(--ink-soft);");
    expect(realce).toContain("font-weight: 500;");
    for (const token of ["--again", "--hard", "--good", "--easy"]) {
      expect(realce).not.toContain(token);
    }
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

  it("dá ao botão primário o fundo `--ink` do handoff, não o accent", () => {
    // `bg-primary` é o accent, e o accent é de link, foco e item ativo. O
    // registry devolve a variante accent toda vez que o componente é regerado,
    // e o painel é a tela onde isso aparece primeiro.
    const botao = readFileSync(join(raiz, "shared", "ui", "button.tsx"), "utf8");
    expect(botao).toContain('default: "bg-ink text-paper"');
    expect(botao).not.toContain('default: "bg-primary');
    // `link` continua no accent: ali a variante é link de verdade.
  });

  it("dá ao botão secundário o filete de 1px `--ink`", () => {
    const botao = readFileSync(join(raiz, "shared", "ui", "button.tsx"), "utf8");
    const outline = botao.slice(botao.indexOf("outline:"));
    expect(outline.slice(0, 120)).toContain("border-ink");
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

describe("o editor do handoff", () => {
  const editor = readFileSync(
    join(raiz, "features", "notes", "components", "editor.tsx"),
    "utf8",
  );
  const pagina = readFileSync(
    join(raiz, "app", "notes", "[noteId]", "edit", "page.tsx"),
    "utf8",
  );

  it("é um retângulo só, com a borda no container", () => {
    // As bordas estavam no textarea e na caixa do preview: duas caixas soltas
    // em vez do retângulo com divisória.
    expect(editor).toContain("rounded-md border border-rule rail:grid-cols-2");
  });

  it("vira a divisória nos 900px, de horizontal para vertical", () => {
    expect(editor).toContain("border-b border-rule rail:border-r rail:border-b-0");
  });

  it("dá ao textarea as duas alturas do handoff e nenhuma borda", () => {
    // 420px abaixo de 900, 720px acima.
    expect(editor).toContain("min-h-105");
    expect(editor).toContain("rail:min-h-180");
    expect(editor).not.toContain("min-h-[24rem]");
  });

  it("desliga o corretor e não oferece exemplo de LaTeX", () => {
    // Markdown com LaTeX é sublinhado de ponta a ponta pelo corretor, e o
    // placeholder longo competia com a nota em branco.
    expect(editor).toContain("spellCheck={false}");
    expect(editor).not.toContain("placeholder");
  });

  it("dá à pré-visualização a medida e o respiro do handoff", () => {
    // 680px de largura, padding 20/24/32 — e `note-prose`, que é o default de
    // `MathMarkdown`: sem a classe, nenhuma medida da leitura bate.
    expect(editor).toContain("max-w-170");
    expect(editor).toContain("px-6 pt-5 pb-8");
    expect(editor).not.toContain("className=\"card-face\"");
  });

  it("grava 900ms depois da última tecla, como o handoff", () => {
    expect(editor).toContain("const DEBOUNCE_MS = 900");
  });

  it("não deixa Mono nem ícone no cabeçalho do editor", () => {
    // Os rótulos dos painéis e o fio do cabeçalho são Sans a 13px; o handoff
    // proíbe ícone decorativo.
    expect(editor).not.toContain("font-mono text-xs");
    expect(pagina).not.toContain("lucide-react");
  });

  it("deixa o fio do cabeçalho em dois níveis, sem o módulo", () => {
    expect(pagina).toContain("courseTitle");
    expect(pagina).toContain("lessonTitle");
    expect(pagina).not.toContain("modulo.title");
  });
});

describe("as três telas de cursos do handoff", () => {
  const cursos = readFileSync(join(raiz, "app", "courses", "page.tsx"), "utf8");
  const curso = readFileSync(
    join(raiz, "app", "courses", "[courseSlug]", "page.tsx"),
    "utf8",
  );
  const aula = readFileSync(
    join(raiz, "app", "lessons", "[lessonId]", "page.tsx"),
    "utf8",
  );
  const forms = readFileSync(
    join(raiz, "features", "courses", "components", "forms.tsx"),
    "utf8",
  );
  const modulo = readFileSync(
    join(raiz, "features", "courses", "components", "module-row.tsx"),
    "utf8",
  );
  const notaNova = readFileSync(
    join(raiz, "features", "notes", "components", "capture-note-button.tsx"),
    "utf8",
  );
  const telas: [string, string][] = [
    ["cursos", cursos],
    ["curso", curso],
    ["aula", aula],
  ];

  it("não escreve o processo de desenvolvimento na interface", () => {
    // A sobrancelha dizia "fatia 1 — casca navegável" no alto de /courses.
    expect(cursos).not.toMatch(/fatia \d/i);
  });

  it.each(telas)("dá ao h1 de %s os 28px com peso 500", (_nome, tela) => {
    expect(tela).toContain("text-xl font-medium");
    expect(tela).not.toContain("font-semibold");
  });

  it.each(telas)("tira a Mono da tela %s", (_nome, tela) => {
    // Mono é código e sintaxe de card (SPEC §6); fio, meta e status são Sans
    // de 13px.
    expect(tela).not.toContain("font-mono");
  });

  it("abre o cabeçalho por botão, não por formulário sempre visível", () => {
    // O rótulo dos dois primeiros é da página; o da aula é o default do botão
    // que cria a nota, que o painel também usa.
    expect(cursos).toContain("Novo curso");
    expect(curso).toContain("Novo módulo");
    expect(notaNova).toContain("Nova nota");
    for (const tela of [cursos, curso]) {
      expect(tela).toContain("CreateDisclosure");
    }
  });

  it("expande o módulo por botão que anuncia o próprio estado", () => {
    expect(modulo).toContain("aria-expanded");
    for (const glifo of ["▸", "▾"]) {
      expect(modulo).toContain(glifo);
    }
  });

  it("renomeia inline: Enter salva, Esc cancela, blur salva", () => {
    expect(forms).toContain("onKeyDown");
    expect(forms).toContain("onBlur");
    expect(forms).toContain("Escape");
    // Os dois botões-ícone do campo de renomear saem com o resto dos ícones.
    expect(forms).not.toContain("Salvar título");
    expect(forms).not.toContain("Cancelar renomeação");
  });

  it("move por glifo de texto, como o resto do handoff", () => {
    for (const glifo of ["↑", "↓"]) {
      expect(forms).toContain(glifo);
    }
  });

  it("marca a aula estudada por checkbox de 18px no accent", () => {
    expect(forms).toContain('type="checkbox"');
    expect(forms).toContain("accent-accent");
    expect(forms).toContain("size-4.5");
  });

  it("dá ao botão de estudada o estado que o leitor de tela anuncia", () => {
    expect(forms).toContain("aria-pressed");
    expect(forms).toContain("Marcar como estudada");
    expect(forms).toContain("Desmarcar como estudada");
  });

  it("junta o arquivado numa seção em vez de apagá-lo na lista", () => {
    for (const tela of [cursos, curso]) {
      expect(tela).toContain("Arquivados (");
      expect(tela).toContain("archived");
      expect(tela).not.toContain("opacity-60");
    }
    // Quem escreve o rótulo é o botão, usado pelas duas seções.
    expect(forms).toContain("Restaurar");
  });

  it("lista os módulos em `ol`, que é a ordem que o usuário arruma", () => {
    expect(curso).toContain("<ol");
  });

  it("convida a criar a primeira aula do módulo vazio", () => {
    expect(modulo).toContain("Módulo sem aulas.");
    expect(modulo).toContain("Criar a primeira aula");
  });

  it("escreve o convite da aula sem nota como o handoff", () => {
    expect(aula).toContain(
      "Esta aula ainda não tem notas. Comece pela anotação da aula:",
    );
    expect(aula).toContain("escrever a primeira nota");
  });

  it("anuncia o estado de estudada por `role=status`", () => {
    expect(aula).toContain('role="status"');
  });
});

describe("nenhum ícone de biblioteca em `src`", () => {
  // SPEC §6, Forma: nenhum ícone decorativo; os glifos ▸ ▾ ↑ ↓ » são texto.
  // A Fatia 20 tirou o último consumidor de `lucide-react`.
  it("não importa `lucide-react` em arquivo nenhum", () => {
    const comIcone = arquivosDeFonte(["app", "features", "shared"])
      .filter(([, texto]) => texto.includes("lucide-react"))
      .map(([caminho]) => caminho);
    expect(comIcone).toEqual([]);
  });

  it("não guarda a dependência no `package.json`", () => {
    const pkg = readFileSync(join(raiz, "..", "package.json"), "utf8");
    expect(pkg).not.toContain("lucide-react");
  });
});
