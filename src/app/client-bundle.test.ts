import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

// O schema do banco é um módulo de servidor: dez `pgTable`, o `customType` do
// tsvector e os templates `sql` do drizzle. Importado como VALOR por um módulo
// que o `"use client"` alcança, ele vai inteiro para o JS do navegador — e no
// dia em que `schema.ts` precisar de qualquer coisa server-only, a tela quebra
// com um erro de build que não aponta para a causa.
//
// Tipo é outra história: `import type` some no build. A trava proíbe o valor.
//
// Esta é a varredura que o `tsc` não faz: ele não sabe o que é bundle.

const raiz = join(import.meta.dirname, "..");

const SERVIDOR = ["db/schema.ts", "db/index.ts"];

/** Todo `.ts`/`.tsx` de fonte sob `src`, menos os testes. */
function fontes(): string[] {
  return readdirSync(raiz, { withFileTypes: true, recursive: true })
    .filter(
      (entrada) =>
        entrada.isFile() &&
        /\.tsx?$/.test(entrada.name) &&
        !/\.test\.tsx?$/.test(entrada.name),
    )
    .map((entrada) =>
      relative(raiz, join(entrada.parentPath, entrada.name)).replace(/\\/g, "/"),
    );
}

/** O arquivo que um especificador de import aponta, relativo a `src`. */
function alvo(deOnde: string, especificador: string): string | null {
  const bruto = especificador.startsWith("@/")
    ? join(raiz, especificador.slice(2))
    : especificador.startsWith(".")
      ? resolve(raiz, dirname(deOnde), especificador)
      : null; // pacote do node_modules: não é fonte nossa

  if (bruto === null) return null;

  const candidatos = [
    bruto,
    `${bruto}.ts`,
    `${bruto}.tsx`,
    join(bruto, "index.ts"),
    join(bruto, "index.tsx"),
  ];
  const achado = candidatos.find(
    (caminho) => existsSync(caminho) && /\.tsx?$/.test(caminho),
  );

  return achado === undefined
    ? null
    : relative(raiz, achado).replace(/\\/g, "/");
}

/**
 * Os módulos que cada arquivo importa como valor. `import type` e
 * `import { type X }` ficam de fora: eles não sobrevivem ao build.
 */
function importesDeValor(caminho: string, codigo: string): string[] {
  const alvos: string[] = [];

  // Comentário fora primeiro, e import só no começo da linha: este próprio
  // arquivo escreve "import type" em prosa, e a varredura caía nisso.
  const fonte = codigo
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  for (const casado of fonte.matchAll(
    /^(?:import|export)\s+(?!type\s)([\s\S]*?)from\s+"([^"]+)"/gm,
  )) {
    const clausula = casado[1] ?? "";
    const especificador = casado[2] ?? "";

    // `import { type A, type B } from "x"` também é só tipo.
    const nomes = clausula.match(/\{([\s\S]*)\}/)?.[1];
    const soTipos =
      nomes !== undefined &&
      clausula.replace(/\{[\s\S]*\}/, "").trim() === "" &&
      nomes
        .split(",")
        .filter((nome) => nome.trim() !== "")
        .every((nome) => nome.trim().startsWith("type "));

    if (soTipos) continue;

    const destino = alvo(caminho, especificador);

    if (destino !== null) alvos.push(destino);
  }

  return alvos;
}

const codigo = new Map(
  fontes().map((caminho) => [caminho, readFileSync(join(raiz, caminho), "utf8")]),
);

const clientes = [...codigo]
  .filter(([, fonte]) => /^\s*["']use client["']/.test(fonte))
  .map(([caminho]) => caminho);

/** `"use server"`: o Next troca o módulo por um stub, e a travessia para aqui. */
function eFronteira(caminho: string): boolean {
  return /^\s*["']use server["']/.test(codigo.get(caminho) ?? "");
}

/** O caminho de importação de valor que leva de um `"use client"` ao servidor. */
function caminhoAteOServidor(entrada: string): string[] | null {
  const fila: string[][] = [[entrada]];
  const vistos = new Set([entrada]);

  while (fila.length > 0) {
    const trilha = fila.shift();

    if (trilha === undefined) break;

    const atual = trilha[trilha.length - 1] ?? "";

    if (SERVIDOR.includes(atual)) return trilha;

    // Uma Server Action não leva o que importa para o navegador: o cliente
    // recebe só a referência, e é por isso que `editor.tsx` pode importar
    // `../actions` sem arrastar o `db` junto.
    if (atual !== entrada && eFronteira(atual)) continue;

    for (const vizinho of importesDeValor(atual, codigo.get(atual) ?? "")) {
      if (vistos.has(vizinho)) continue;

      vistos.add(vizinho);
      fila.push([...trilha, vizinho]);
    }
  }

  return null;
}

describe("fronteira cliente/servidor", () => {
  it("acha os módulos de cliente que existem", () => {
    expect(clientes.length).toBeGreaterThan(0);
  });

  it.each(clientes)("%s não arrasta o schema do banco para o navegador", (
    cliente,
  ) => {
    const trilha = caminhoAteOServidor(cliente);

    expect(trilha?.join(" → ") ?? null).toBe(null);
  });
});
