import { describe, expect, it } from "vitest";

import { realcarCodigo, type Trecho } from "./code";

/** O realce lido como "classe:texto", para o caso ficar legível no teste. */
function lido(codigo: string): string[] {
  return realcarCodigo(codigo).map(
    (trecho: Trecho) => `${trecho.classe ?? "-"}:${trecho.texto}`,
  );
}

describe("realce monocromático", () => {
  it("devolve o código inteiro, sem perder nem repetir caractere", () => {
    const codigo = 'def f(x):  # soma\n    return x + 1  # ou "dois"\n';

    expect(realcarCodigo(codigo).map((t) => t.texto).join("")).toBe(codigo);
  });

  it("marca o comentário até o fim da linha", () => {
    expect(lido("x = 1  # soma\ny = 2")).toContain("comentario:# soma");
  });

  it("não vê comentário dentro de string", () => {
    const trechos = lido('print("oi # não")');

    expect(trechos).toContain('texto:"oi # não"');
    expect(trechos.some((t) => t.startsWith("comentario"))).toBe(false);
  });

  it("não vê palavra-chave nem número dentro de string", () => {
    const trechos = lido("s = 'return 42'");

    expect(trechos).toContain("texto:'return 42'");
    expect(trechos).not.toContain("chave:return");
    expect(trechos).not.toContain("numero:42");
  });

  it("marca a palavra-chave inteira, nunca o pedaço de um nome", () => {
    expect(lido("def f():")).toContain("chave:def");
    // `define` começa por `def` e não é palavra-chave
    expect(lido("define = 1")).not.toContain("chave:def");
    // nem `x_for`, nem `forma`
    expect(lido("forma = 2")).not.toContain("chave:for");
  });

  it("marca o número inteiro, inclusive o decimal", () => {
    expect(lido("x = 42")).toContain("numero:42");
    expect(lido("x = 3.5")).toContain("numero:3.5");
  });

  it("não marca o dígito que faz parte de um nome", () => {
    expect(lido("x1 = 1")).not.toContain("numero:1\n");
    expect(lido("x1 = 0").filter((t) => t.startsWith("numero"))).toEqual([
      "numero:0",
    ]);
  });

  it("entende a string de três aspas em várias linhas", () => {
    const trechos = lido('s = """uma\ndocstring"""\nx = 1');

    expect(trechos).toContain('texto:"""uma\ndocstring"""');
    expect(trechos).toContain("numero:1");
  });

  it("fecha no fim da linha a string de uma aspa que não fecha", () => {
    // Trecho de código copiado pela metade não deve engolir a nota inteira.
    const trechos = lido("s = 'aberta\nx = 1");

    expect(trechos).toContain("texto:'aberta");
    expect(trechos).toContain("numero:1");
  });

  it("marca o comentário de barra dupla também", () => {
    // O usuário escreve Python, mas cola SQL e JavaScript nas notas.
    expect(lido("const x = 1; // nota")).toContain("comentario:// nota");
  });

  it("devolve lista vazia para código vazio", () => {
    expect(realcarCodigo("")).toEqual([]);
  });
});
