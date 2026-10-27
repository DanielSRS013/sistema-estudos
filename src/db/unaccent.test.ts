import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// A trava do item que só morde no futuro: as colunas `search_vector` chamam
// `immutable_unaccent`, e nem a extensão nem a função cabem no snapshot do
// drizzle. Se um rebaseline refizer as migrations a partir do schema, o
// `CREATE FUNCTION` não vem junto — e a migration morre no meio, num comando
// que ninguém consegue repetir à mão sem entender por quê.
//
// Este teste não conserta isso; ele avisa na hora, offline, dentro do
// `pnpm check`. O conserto está escrito em `unaccent.sql`: colar o arquivo no
// topo da primeira migration.

const aqui = import.meta.dirname;
const prelude = readFileSync(join(aqui, "unaccent.sql"), "utf8");
const schema = readFileSync(join(aqui, "schema.ts"), "utf8");

const pasta = join(aqui, "..", "..", "drizzle");
const migrations = readdirSync(pasta)
  .filter((arquivo) => arquivo.endsWith(".sql"))
  .sort()
  .map((arquivo) => ({
    arquivo,
    sql: readFileSync(join(pasta, arquivo), "utf8"),
  }));

// Sem comentários e com o espaço em branco achatado: o que se compara é o
// comando, não a indentação nem a quebra de linha de quem colou.
function normalizar(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Os comandos do prelúdio, um por `;`, já achatados. */
const comandos = normalizar(prelude)
  .split(";")
  .map((comando) => comando.trim())
  .filter((comando) => comando !== "");

const RECADO =
  "O prelúdio de src/db/unaccent.sql não está em nenhuma migration. " +
  "Se a linha de migrations foi refeita, cole o arquivo no topo da primeira, " +
  "antes de qualquer CREATE TABLE.";

describe("o prelúdio da busca acento-insensível", () => {
  it("tem comando para conferir", () => {
    // Se o arquivo esvaziar, os testes abaixo passariam sem verificar nada.
    expect(comandos).toHaveLength(2);
    expect(comandos[0]).toContain("CREATE EXTENSION");
    expect(comandos[1]).toContain("immutable_unaccent");
  });

  it("é o que o schema chama", () => {
    // A premissa: enquanto as colunas geradas chamarem a função, o prelúdio é
    // obrigatório. Se um dia deixarem, este teste cai junto — de propósito.
    expect(schema).toContain("immutable_unaccent(");
    expect(schema).toContain("generatedAlwaysAs");
  });

  it("vive numa migration, e não só no schema", () => {
    const comPrelude = migrations.filter(({ sql }) => {
      const achatada = normalizar(sql);
      return comandos.every((comando) => achatada.includes(comando));
    });

    expect(comPrelude.map((m) => m.arquivo), RECADO).not.toEqual([]);
  });

  it("vem antes da primeira coluna gerada que o usa", () => {
    const indice = (teste: (sql: string) => boolean) =>
      migrations.findIndex(({ sql }) => teste(sql));

    const doPrelude = indice((sql) => {
      const achatada = normalizar(sql);
      return comandos.every((comando) => achatada.includes(comando));
    });
    const daColuna = indice(
      (sql) =>
        /GENERATED ALWAYS AS[\s\S]*immutable_unaccent/i.test(sql) ||
        /immutable_unaccent[\s\S]*GENERATED ALWAYS AS/i.test(sql),
    );

    expect(daColuna).toBeGreaterThanOrEqual(0);
    // Na mesma migration serve: dentro do arquivo o prelúdio está no topo.
    expect(doPrelude).toBeGreaterThanOrEqual(0);
    expect(doPrelude).toBeLessThanOrEqual(daColuna);
  });
});
