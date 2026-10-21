import { describe, expect, it } from "vitest";

import { marcarLacunasVazias } from "./empty-gaps";
import { lacunasVazias } from "./parser";
import { MARCA_VAZIA } from "@/shared/markdown-empty-gap";

describe("lacunasVazias", () => {
  it("acha a lacuna vazia pela posição no texto inteiro", () => {
    const markdown = "Primeira linha.\n\nUma lacuna {{}} aqui.";
    const achadas = lacunasVazias(markdown);

    expect(achadas).toHaveLength(1);
    // O recorte é o `{{}}` inteiro, abertura e fechamento incluídos.
    expect(markdown.slice(achadas[0]?.inicio, achadas[0]?.fim)).toBe("{{}}");
    expect(achadas[0]?.line).toBe(3);
  });

  it("conta espaço em branco como vazia e conteúdo como preenchida", () => {
    expect(lacunasVazias("Vazia {{   }} aqui.")).toHaveLength(1);
    expect(lacunasVazias("Cheia {{resposta}} aqui.")).toEqual([]);
    expect(lacunasVazias("Com dica {{::só a dica}} aqui.")).toEqual([]);
  });

  it("ignora o que o parser também ignora", () => {
    // Dentro de cerca de código nada é card — e nada é lacuna vazia. Depois do
    // `Q::` o cloze não é lido, então a reclamação não existe e a marca na
    // pré-visualização apontaria para um erro que a tela não reporta.
    expect(lacunasVazias("```\nUma {{}} de exemplo.\n```")).toEqual([]);
    expect(lacunasVazias("Q:: Pergunta {{}}?\nA:: Resposta.")).toEqual([]);
    // Antes do `Q::`, no mesmo bloco, o cloze continua valendo.
    expect(lacunasVazias("Antes {{}} disso.\nQ:: Pergunta?\nA:: Resposta.")).toHaveLength(1);
  });

  it("acha as duas lacunas vazias de blocos diferentes", () => {
    const achadas = lacunasVazias("Uma {{}} aqui.\n\nOutra {{}} ali.");

    expect(achadas.map((lacuna) => lacuna.line)).toEqual([1, 3]);
  });
});

describe("marcarLacunasVazias", () => {
  it("troca cada lacuna vazia pela marca e deixa o resto intacto", () => {
    expect(marcarLacunasVazias("Uma {{}} aqui.")).toBe(
      `Uma ${MARCA_VAZIA} aqui.`,
    );
    expect(marcarLacunasVazias("Uma {{  }} e outra {{}}.")).toBe(
      `Uma ${MARCA_VAZIA} e outra ${MARCA_VAZIA}.`,
    );
  });

  it("devolve o texto idêntico quando não há lacuna vazia", () => {
    const limpo = "# Título\n\nUma {{resposta}} e $a^2$.\n\n```\n{{}}\n```";

    expect(marcarLacunasVazias(limpo)).toBe(limpo);
  });

  it("não mexe na lacuna preenchida ao lado da vazia", () => {
    expect(marcarLacunasVazias("Cheia {{r}}, vazia {{}}.")).toBe(
      `Cheia {{r}}, vazia ${MARCA_VAZIA}.`,
    );
  });
});
