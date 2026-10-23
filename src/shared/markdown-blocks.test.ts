import { describe, expect, it } from "vitest";

import { blocos } from "./markdown-blocks";

describe("blocos", () => {
  it("separa parágrafos por linha em branco e guarda a linha de origem", () => {
    const encontrados = blocos("primeira\nsegunda\n\nterceira\n");

    expect(encontrados).toEqual([
      { linhas: ["primeira", "segunda"], primeiraLinha: 1 },
      { linhas: ["terceira"], primeiraLinha: 4 },
    ]);
  });

  it("descarta o conteúdo de uma cerca de três backticks", () => {
    const markdown = ["antes", "", "```python", "# comentário", "```", "", "depois"].join(
      "\n",
    );

    expect(blocos(markdown)).toEqual([
      { linhas: ["antes"], primeiraLinha: 1 },
      { linhas: ["depois"], primeiraLinha: 7 },
    ]);
  });

  it("descarta o conteúdo de uma cerca de tils", () => {
    const markdown = ["~~~", "nada aqui conta", "~~~", "", "isto conta"].join("\n");

    expect(blocos(markdown)).toEqual([
      { linhas: ["isto conta"], primeiraLinha: 5 },
    ]);
  });

  it("não fecha a cerca com uma marca mais curta que a da abertura", () => {
    const markdown = ["````", "```", "ainda dentro", "````", "", "fora"].join("\n");

    expect(blocos(markdown)).toEqual([{ linhas: ["fora"], primeiraLinha: 6 }]);
  });

  it("não fecha a cerca com marca de outro caractere", () => {
    const markdown = ["```", "~~~", "ainda dentro", "```", "", "fora"].join("\n");

    expect(blocos(markdown)).toEqual([{ linhas: ["fora"], primeiraLinha: 6 }]);
  });

  it("aceita cerca indentada até três espaços e ignora a de quatro", () => {
    const indentada = ["   ```", "dentro", "   ```", "", "fora"].join("\n");

    expect(blocos(indentada)).toEqual([{ linhas: ["fora"], primeiraLinha: 5 }]);

    // A marca de quatro espaços não abre cerca: se abrisse, "ainda texto"
    // seria conteúdo de código e não sobraria bloco nenhum. Ela abre bloco
    // indentado, então a própria linha sai da varredura e o texto sem recuo
    // depois dela é um parágrafo novo, na linha 2.
    const demais = ["    ```", "ainda texto"].join("\n");

    expect(blocos(demais)).toEqual([
      { linhas: ["ainda texto"], primeiraLinha: 2 },
    ]);
  });

  it("fecha o bloco aberto quando uma cerca começa na linha seguinte", () => {
    const markdown = ["texto", "```", "dentro", "```"].join("\n");

    expect(blocos(markdown)).toEqual([{ linhas: ["texto"], primeiraLinha: 1 }]);
  });

  it("cerca sem fechamento engole o resto da nota", () => {
    const markdown = ["antes", "", "```", "dentro", "", "ainda dentro"].join("\n");

    expect(blocos(markdown)).toEqual([{ linhas: ["antes"], primeiraLinha: 1 }]);
  });

  it("descarta o bloco indentado por quatro espaços", () => {
    const markdown = [
      "antes",
      "",
      "    codigo = 1",
      "    outra = 2",
      "",
      "depois",
    ].join("\n");

    expect(blocos(markdown)).toEqual([
      { linhas: ["antes"], primeiraLinha: 1 },
      { linhas: ["depois"], primeiraLinha: 6 },
    ]);
  });

  it("descarta o bloco indentado por tabulação", () => {
    const markdown = ["\tcodigo = 1", "", "depois"].join("\n");

    expect(blocos(markdown)).toEqual([{ linhas: ["depois"], primeiraLinha: 3 }]);
  });

  it("não trata como código a linha indentada que continua um parágrafo", () => {
    // Regra do CommonMark: bloco indentado não interrompe parágrafo. A linha
    // recuada depois de texto é continuação, e o que está nela ainda conta.
    const markdown = ["texto", "    ainda o mesmo parágrafo"].join("\n");

    expect(blocos(markdown)).toEqual([
      { linhas: ["texto", "    ainda o mesmo parágrafo"], primeiraLinha: 1 },
    ]);
  });

  it("não trata como código o recuo que continua um item de lista", () => {
    // Lista solta: o parágrafo recuado depois da linha em branco é conteúdo do
    // item — o Markdown o renderiza dentro do `<li>`, não num `<pre>`. Lido
    // como código, a lacuna e a tag que estivessem nele desapareciam caladas.
    const markdown = [
      "- Primeiro item",
      "",
      "    Segundo parágrafo do item",
      "",
      "- Segundo item",
    ].join("\n");

    expect(blocos(markdown)).toEqual([
      { linhas: ["- Primeiro item"], primeiraLinha: 1 },
      { linhas: ["    Segundo parágrafo do item"], primeiraLinha: 3 },
      { linhas: ["- Segundo item"], primeiraLinha: 5 },
    ]);
  });

  it("não trata como código a sublista recuada por quatro espaços", () => {
    const markdown = ["1. item", "", "    - sub"].join("\n");

    expect(blocos(markdown)).toEqual([
      { linhas: ["1. item"], primeiraLinha: 1 },
      { linhas: ["    - sub"], primeiraLinha: 3 },
    ]);
  });

  it("volta a tratar recuo como código depois que a lista termina", () => {
    // Parágrafo sem recuo fecha a lista: o recuo seguinte é código outra vez.
    const markdown = [
      "- item",
      "",
      "parágrafo normal",
      "",
      "    codigo = 1",
      "",
      "depois",
    ].join("\n");

    expect(blocos(markdown)).toEqual([
      { linhas: ["- item"], primeiraLinha: 1 },
      { linhas: ["parágrafo normal"], primeiraLinha: 3 },
      { linhas: ["depois"], primeiraLinha: 7 },
    ]);
  });

  it("devolve lista vazia para nota vazia ou só de brancos", () => {
    expect(blocos("")).toEqual([]);
    expect(blocos("\n  \n\t\n")).toEqual([]);
  });
});
