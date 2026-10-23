import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Travas da Fatia 21. O que elas guardam não aparece em teste de unidade: a
// acento-insensibilidade mora metade no banco (coluna gerada) e metade na
// consulta (lado do termo), e as duas metades se quebram em silêncio — a busca
// continua achando "projeção" e só deixa de achar "projecao".

const raiz = join(import.meta.dirname, "..", "..", "..");

const schema = readFileSync(join(raiz, "src", "db", "schema.ts"), "utf8");
const queries = readFileSync(
  join(raiz, "src", "features", "search", "queries.ts"),
  "utf8",
);

const migrations = readdirSync(join(raiz, "drizzle"))
  .filter((nome) => nome.endsWith(".sql"))
  .map((nome) => readFileSync(join(raiz, "drizzle", nome), "utf8"))
  .join("\n");

/**
 * A expressão chama `unaccent` em vez de `immutable_unaccent`.
 *
 * `[^_]unaccent\(` consumia um caractere antes do nome, então a chamada no
 * começo da expressão escapava. A alternativa é olhar para trás sem consumir.
 */
function chamaUnaccentDireto(expressao: string): boolean {
  return /(?<!_)unaccent\(/.test(expressao);
}

/** O corpo de `generatedAlwaysAs` de cada coluna gerada do schema. */
function expressoesGeradas(): string[] {
  return [...schema.matchAll(/generatedAlwaysAs\(\s*sql`([^`]*)`/g)].map(
    (m) => m[1] ?? "",
  );
}

describe("o vetor de busca tira o acento", () => {
  it("tem uma coluna gerada em notes e outra em cards", () => {
    expect(expressoesGeradas()).toHaveLength(2);
  });

  it("não deixa coluna gerada chamar to_tsvector sem tirar o acento", () => {
    for (const expressao of expressoesGeradas()) {
      expect(expressao).toContain("immutable_unaccent(");
    }
  });

  it("não deixa coluna gerada chamar `unaccent` direto", () => {
    // `unaccent(text)` é STABLE: o Postgres recusa a coluna com
    // "generation expression is not immutable", e a migration falha no meio.
    for (const expressao of expressoesGeradas()) {
      expect(chamaUnaccentDireto(expressao)).toBe(false);
    }
  });

  it("varre os dois lados: título/corpo da nota e face/resposta do card", () => {
    expect(expressoesGeradas().join("\n")).toContain("coalesce(title, '')");
    expect(expressoesGeradas().join("\n")).toContain("coalesce(content, '')");
    expect(expressoesGeradas().join("\n")).toContain("coalesce(prompt, '')");
    expect(expressoesGeradas().join("\n")).toContain("coalesce(answer, '')");
  });
});

describe("a trava de `unaccent` direto", () => {
  it("pega a chamada no começo da expressão", () => {
    expect(chamaUnaccentDireto("unaccent(coalesce(title, ''))")).toBe(true);
  });

  it("pega a chamada no meio da expressão", () => {
    expect(
      chamaUnaccentDireto("to_tsvector('portuguese', unaccent(title))"),
    ).toBe(true);
  });

  it("não confunde `immutable_unaccent` com ela", () => {
    expect(
      chamaUnaccentDireto(
        "to_tsvector('portuguese', immutable_unaccent(title))",
      ),
    ).toBe(false);
  });
});

describe("a migration que criou o vetor", () => {
  it("cria a extensão unaccent", () => {
    expect(migrations).toMatch(/create extension if not exists unaccent/i);
  });

  it("cria o invólucro como IMMUTABLE, não como STABLE", () => {
    // O `[^;]` prende a busca ao mesmo comando: com `[\s\S]*?` o regex
    // alcançava o `immutable_unaccent` das colunas geradas, lá embaixo, e a
    // trava passava mesmo com a função declarada STABLE.
    expect(migrations).toMatch(
      /create or replace function immutable_unaccent\(text\)[^;]*?language sql immutable/i,
    );
  });

  it("recria o índice GIN de notes que o DROP COLUMN levou", () => {
    // drizzle-kit não emite este `CREATE INDEX`: o snapshot segue achando que
    // `notes_search_idx` existe. Sem ele a busca de notas perde o índice e
    // ninguém percebe até a base crescer.
    expect(migrations).toMatch(
      /drop column "search_vector"[\s\S]*?create index "notes_search_idx" on "notes" using gin/i,
    );
  });

  it("cria o índice GIN de cards", () => {
    expect(migrations).toMatch(
      /create index "cards_search_idx" on "cards" using gin/i,
    );
  });
});

describe("a consulta da busca", () => {
  it("tira o acento do que o usuário digitou", () => {
    expect(queries).toMatch(
      /websearch_to_tsquery\('portuguese', immutable_unaccent\(\$\{/,
    );
  });

  it("monta a consulta de casamento sempre sem acento", () => {
    expect(queries).toMatch(
      /const consulta = sql`websearch_to_tsquery\('portuguese', immutable_unaccent\(/,
    );
  });

  it("não casa nem ordena pela consulta do destaque", () => {
    // `destaque` é a união das duas escritas e serve ao `ts_headline`. Usá-la
    // no `@@` faria o termo com acento casar o texto acentuado por fora do
    // vetor, e o acento voltaria a importar para quem digita sem ele.
    expect(queries).not.toMatch(/@@ \$\{destaque\}/);
    expect(queries).not.toMatch(/ts_rank_cd\([^)]*\$\{destaque\}/);
  });

  it("consulta o vetor das duas tabelas", () => {
    expect(queries).toContain("notes.searchVector");
    expect(queries).toContain("cards.searchVector");
  });

  it("deixa o card arquivado fora dos resultados", () => {
    expect(queries).toMatch(/cards\.archivedAt\} is null/);
  });
});

describe("o destaque do trecho", () => {
  // Achado na conferência em navegador: com a consulta só sem acento, o
  // `ts_headline` parou de destacar até o termo escrito COM acento — ele
  // reanalisa o texto cru, cujos lexemas trazem o diacrítico. Sem destaque o
  // `ts_headline` ainda devolve o começo do texto em vez do trecho relevante,
  // então a busca acha e não aponta.
  it("manda ao ts_headline o termo como o usuário escreveu, não só o sem acento", () => {
    expect(queries).toMatch(
      /\|\|\s*websearch_to_tsquery\('portuguese', \$\{limpo\}\)/,
    );
  });

  it("não deixa o destaque do texto cru receber só a consulta sem acento", () => {
    // O texto como está tem os lexemas acentuados: sobre ele o destaque é
    // sempre a união das duas escritas. A Fatia 22 abriu uma segunda chamada,
    // sobre `immutable_unaccent(texto)` — essa sim recebe a consulta sem
    // acento, que é a única que casa ali.
    // Um nível de parênteses aninhado basta: o argumento mais fundo é
    // `immutable_unaccent(${coluna})`.
    const chamadas = [
      ...queries.matchAll(/ts_headline\('portuguese', ((?:[^()]|\([^()]*\))*)\)/g),
    ].map((m) => m[1] ?? "");
    expect(chamadas.length).toBeGreaterThan(0);
    for (const chamada of chamadas) {
      if (chamada.includes("immutable_unaccent(")) continue;
      expect(chamada).toContain("${destaque}");
    }
  });

  it("traz as duas escritas de cada coluna, para a tela poder escolher", () => {
    // O recuo não é decidido no SQL: `escolherDestaque` (`hits.ts`) é função
    // pura e tem teste. Aqui a trava é que as duas escritas cheguem — e que
    // nenhuma das duas seja decidida por um `case`, que avaliaria o
    // `ts_headline` do ramo escolhido duas vezes.
    for (const par of ["tituloNota", "corpoNota", "faceCard", "respostaCard"]) {
      expect(queries).toContain(`${par}.comoEsta,`);
      expect(queries).toContain(`${par}.semAcento,`);
    }
    expect(queries).not.toContain("case when");
    expect(queries).toMatch(
      /semAcento: sql<string>`ts_headline\('portuguese', immutable_unaccent\(\$\{coluna\}\), \$\{consulta\}/,
    );
  });
});

describe("o que cada consulta traz", () => {
  // Achado da revisão: `LIMIT 30` sem `ORDER BY` são 30 linhas quaisquer, na
  // ordem em que o bitmap scan as entregar. `mesclarHits` ordena só o que
  // chegou, então a nota mais relevante pode nem estar na lista — e a mesma
  // busca pode devolver listas diferentes.
  it("ordena cada lado por relevância antes de cortar no limite", () => {
    const ordenacoes = queries.match(/\.orderBy\(/g) ?? [];
    expect(ordenacoes).toHaveLength(2);
  });

  it("ordena pelo rank do vetor de cada tabela, não por um só", () => {
    expect(queries).toMatch(/ts_rank_cd\(\$\{notes\.searchVector\}[^)]*\)[^`]*desc/);
    expect(queries).toMatch(/ts_rank_cd\(\$\{cards\.searchVector\}[^)]*\)[^`]*desc/);
  });

  it("não devolve a resposta do card inteira", () => {
    // Face e título são linhas curtas e `HighlightAll` serve. `cards.answer`
    // é o bloco depois do corte: pode ter parágrafos de Markdown e LaTeX, e
    // sem limite de palavras um resultado só ocupa a tela toda.
    // As quatro chamadas passam por `destacar`, então o alvo é a opção que
    // cada coluna recebe — e a face, logo acima, usa `OPCOES_TITULO` com razão.
    const daResposta = queries.match(/destacar\(cards\.answer, (\w+)\)/);
    const daFace = queries.match(/destacar\(cards\.prompt, (\w+)\)/);
    expect(daResposta?.[1]).toBe("OPCOES");
    expect(daFace?.[1]).toBe("OPCOES_TITULO");
  });
});
