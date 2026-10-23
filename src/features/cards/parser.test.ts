import { describe, expect, it } from "vitest";

import { LACUNA } from "@/shared/markdown-cloze";

import { parse } from "./parser";

describe("cloze", () => {
  it("transforma o trecho entre chaves duplas em lacuna", () => {
    const { cards, issues } = parse("A capital é {{Brasília}}.");

    expect(issues).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: "cloze",
      prompt: "A capital é […].",
      answer: "Brasília",
      hint: null,
      ordinal: 0,
    });
  });

  it("gera um card por lacuna, cada um escondendo só a sua", () => {
    const { cards } = parse(
      "A projeção escalar de $s$ sobre $r$ é {{$s \\cdot r / |r|$}}, e a vetorial divide por {{$|r|^2$}}.",
    );

    expect(cards).toHaveLength(2);
    expect(cards[0]?.prompt).toBe(
      "A projeção escalar de $s$ sobre $r$ é […], e a vetorial divide por $|r|^2$.",
    );
    expect(cards[0]?.answer).toBe("$s \\cdot r / |r|$");
    expect(cards[1]?.prompt).toBe(
      "A projeção escalar de $s$ sobre $r$ é $s \\cdot r / |r|$, e a vetorial divide por […].",
    );
    expect(cards[1]?.answer).toBe("$|r|^2$");
    expect(cards.map((card) => card.ordinal)).toEqual([0, 1]);
  });

  it("separa a dica que vem depois de ::", () => {
    const { cards } = parse(
      "O determinante de uma matriz singular é {{zero::pense no que acontece com o\nvolume}}.",
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]?.answer).toBe("zero");
    expect(cards[0]?.hint).toBe("pense no que acontece com o volume");
  });

  it("preserva LaTeX literalmente, mesmo com chaves aninhadas", () => {
    const { cards, issues } = parse(
      "A projeção é {{$\\frac{s \\cdot r}{\\frac{|r|}{2}}$}} no fim.",
    );

    expect(issues).toEqual([]);
    expect(cards[0]?.answer).toBe("$\\frac{s \\cdot r}{\\frac{|r|}{2}}$");
    expect(cards[0]?.prompt).toBe("A projeção é […] no fim.");
  });
});

describe("pergunta e resposta", () => {
  it("lê Q:: e A:: em linhas consecutivas", () => {
    const { cards } = parse(
      "Q:: Por que a projeção escalar pode ser negativa?\nA:: Porque o dot product é negativo.",
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: "qa",
      prompt: "Por que a projeção escalar pode ser negativa?",
      answer: "Porque o dot product é negativo.",
      hint: null,
    });
  });

  it("deixa a resposta ocupar várias linhas até a linha em branco", () => {
    const { cards } = parse(
      [
        "Q:: Por que pode ser negativa?",
        "A:: Porque o dot product é negativo quando o ângulo passa",
        "de 90°, e o denominador $|r|$ é sempre positivo.",
        "",
        "Texto solto que não entra na resposta.",
      ].join("\n"),
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]?.answer).toBe(
      "Porque o dot product é negativo quando o ângulo passa\nde 90°, e o denominador $|r|$ é sempre positivo.",
    );
  });

  it("reporta pergunta sem resposta em vez de inventar um card", () => {
    const { cards, issues } = parse("Q:: Pergunta solta?\n\nOutro parágrafo.");

    expect(cards).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("resposta");
  });
});

describe("o que o parser ignora", () => {
  it("não lê nada dentro de bloco de código cercado", () => {
    const { cards, issues } = parse(
      [
        "Exemplo da sintaxe:",
        "",
        "```markdown",
        "A capital é {{Brasília}}.",
        "Q:: Isto é um exemplo?",
        "A:: É.",
        "```",
        "",
        "Fim.",
      ].join("\n"),
    );

    expect(cards).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("ignora bloco cercado com til e com linguagem", () => {
    const { cards } = parse(
      ["~~~python", "d = {{'a': 1}}", "~~~"].join("\n"),
    );

    expect(cards).toEqual([]);
  });

  it("não lê nada dentro de bloco de código indentado por quatro espaços", () => {
    // O bloco indentado é código tanto quanto o cercado. Lido como parágrafo,
    // ele gerava card do exemplo de sintaxe e as marcas da lacuna
    // renderizavam dentro do `<pre>`.
    const { cards, issues } = parse(
      [
        "Exemplo da sintaxe:",
        "",
        "    A capital é {{Brasília}}.",
        "    Q:: Isto é um exemplo?",
        "    A:: É.",
        "",
        "Fim.",
      ].join("\n"),
    );

    expect(cards).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("não gera card quando a chave dupla está escapada", () => {
    const { cards, issues } = parse(
      "Para escrever uma lacuna, use \\{{resposta}}.",
    );

    expect(cards).toEqual([]);
    expect(issues).toEqual([]);
  });
});

describe("validação", () => {
  it("reclama de lacuna vazia em vez de ignorar em silêncio", () => {
    const { cards, issues } = parse("Uma lacuna vazia {{}} na linha 1.");

    expect(cards).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ line: 1 });
    expect(issues[0]?.message).toContain("vazia");
  });

  it("reclama de lacuna só com espaços", () => {
    const { issues } = parse("Outra {{   }} assim.");

    expect(issues).toHaveLength(1);
  });

  it("aponta a linha do problema dentro da nota", () => {
    const { issues } = parse("# Título\n\nTexto.\n\nLacuna {{}} aqui.");

    expect(issues[0]?.line).toBe(5);
  });

  it("escreve a lacuna vazia com o título e o corpo do handoff", () => {
    // O bloco de alerta do editor compõe "Card não criado: {title} na linha
    // {line}" e mostra `message` como corpo. As duas frases são do handoff, e
    // é aqui que elas ficam travadas: a tela só as exibe.
    const { issues } = parse("Uma lacuna vazia {{}} na linha 1.");

    expect(issues[0]).toEqual({
      line: 1,
      title: "lacuna vazia",
      message:
        "A marcação de lacuna vazia não tem resposta. Escreva a resposta " +
        "entre as chaves, ou apague a marcação. O resto da nota está salvo.",
    });
  });

  it("dá a cada reclamação o título da causa", () => {
    // O título entra na primeira linha do alerta, em 600. Sem ele a tela teria
    // de adivinhar a causa pelo texto da mensagem.
    const vazia = parse("Uma lacuna vazia {{}} aqui.").issues[0];
    const aberta = parse("Uma lacuna {{sem fim por aqui.").issues[0];
    const semResposta = parse("Q:: Uma pergunta?").issues[0];
    const semTexto = parse("Q::\nA::").issues[0];

    expect(vazia?.title).toBe("lacuna vazia");
    expect(aberta?.title).toBe("lacuna que não fecha");
    expect(semResposta?.title).toBe("pergunta sem resposta");
    expect(semTexto?.title).toBe("pergunta ou resposta vazia");
  });

  it("reclama de lacuna que não fecha", () => {
    const { cards, issues } = parse("Uma lacuna {{sem fim por aqui.");

    expect(cards).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("fecha");
  });
});

describe("a nota inteira", () => {
  it("numera os cards na ordem do documento e guarda a linha de cada um", () => {
    const { cards } = parse(
      [
        "# Limites",
        "",
        "O limite fundamental vale {{1}}.",
        "",
        "Q:: E em graus?",
        "A:: Vira $\\pi/180$.",
        "",
        "O seno de zero é {{0}}.",
      ].join("\n"),
    );

    expect(cards.map((card) => [card.ordinal, card.kind, card.line])).toEqual([
      [0, "cloze", 3],
      [1, "qa", 5],
      [2, "cloze", 8],
    ]);
  });

  it("devolve nada para uma nota sem sintaxe de card", () => {
    expect(parse("# Só texto\n\nNada aqui.")).toEqual({
      cards: [],
      issues: [],
    });
  });
});

describe("a marca da lacuna", () => {
  it("é a mesma que o render envolve", () => {
    // A frente sai daqui e o filete de 2px é aplicado no render, por um
    // `span` que o `markdown-cloze` monta em volta desta marca. Com duas
    // cópias da string, uma letra de diferença apagaria o filete sem quebrar
    // teste nenhum — e o cloze apareceria na revisão sem lacuna visível.
    const { cards } = parse("A capital é {{Brasília}}.");

    expect(cards[0]?.prompt).toBe(`A capital é ${LACUNA}.`);
  });
});

describe("lacuna no destino de link", () => {
  it("não faz card da lacuna que está no destino de um link", () => {
    // O Markdown não trata o destino como texto: a lacuna recortada deixaria o
    // href apontando para nada, e o card mostraria um link quebrado.
    const { cards, issues } = parse("Veja [a tabela]({{url}}) no anexo.");

    expect(cards).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      line: 1,
      title: "lacuna no destino de link",
    });
  });

  it("ainda lê a lacuna que vem fora do destino, na mesma linha", () => {
    const { cards, issues } = parse(
      "Veja [a tabela](https://exemplo.org) e note que vale {{sempre}}.",
    );

    expect(issues).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.answer).toBe("sempre");
  });
});

describe("Q:: que não abre o bloco", () => {
  it("reclama da pergunta escrita em item de lista", () => {
    // Sem reclamação o usuário escreve a pergunta, salva, e ela simplesmente
    // não existe: `parse` e `posicoesDeCards` concordam entre si, então nem a
    // tela mostra inconsistência.
    const { cards, issues } = parse(
      ["- Q:: Uma pergunta?", "- A:: Uma resposta."].join("\n"),
    );

    expect(cards).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      line: 1,
      title: "pergunta dentro de lista ou citação",
    });
  });

  it("reclama da pergunta escrita em citação", () => {
    const { cards, issues } = parse(
      ["> Q:: Uma pergunta?", "> A:: Uma resposta."].join("\n"),
    );

    expect(cards).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.title).toBe("pergunta dentro de lista ou citação");
  });

  it("aponta a linha do Q:: disfarçado, não a do bloco", () => {
    const { issues } = parse(
      ["Um parágrafo qualquer.", "1. Q:: Uma pergunta?"].join("\n"),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.line).toBe(2);
  });

  it("não reclama do Q:: que abre a linha depois de um texto", () => {
    // Já funcionava: o Q:: corta o bloco, o que vem antes segue cloze.
    const { cards, issues } = parse(
      ["Contexto da pergunta:", "Q:: Uma pergunta?", "A:: Uma resposta."].join(
        "\n",
      ),
    );

    expect(issues).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.kind).toBe("qa");
  });
});
