// Realce de código sem cor nenhuma. Módulo puro: entra o texto do bloco, sai a
// lista de trechos com a classe de cada um.
//
// SPEC §6 reserva o viridis para os botões de avaliação, e o handoff pinta o
// bloco de código em dois tons só: comentário em `--ink-soft`, o resto em
// `--ink`. Aqui o desenho vai um passo além do protótipo e distingue quatro
// classes — comentário, string, palavra-chave e número —, ainda dentro dos dois
// tons: comentário, string e número recuam para `--ink-soft`, a palavra-chave
// ganha peso 500. Nenhuma informação depende de cor.
//
// Sem dependência nova: `SPEC.md` §7 não tem realçador de sintaxe, e um
// destaque monocromático de quatro classes não justifica instalar um. A
// varredura é de uma passada, da esquerda para a direita, que é o que garante
// que `#` dentro de string não vire comentário e `return` dentro de string não
// vire palavra-chave.
//
// As palavras-chave são as do Python, a linguagem das notas; as poucas que o
// usuário cola de JavaScript e SQL (`const`, `function`, `select`) entram na
// mesma lista. Palavra de outra linguagem que não esteja aqui sai como texto
// comum — é um realce que não desenha, nunca um realce errado.

export type Classe = "comentario" | "texto" | "chave" | "numero";

export type Trecho = {
  /** `null` é o código comum: identificador, operador, espaço. */
  classe: Classe | null;
  texto: string;
};

const CHAVES = new Set([
  // Python
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "while",
  "with",
  "yield",
  // o que aparece colado de JavaScript e SQL
  "const",
  "let",
  "var",
  "function",
  "new",
  "typeof",
  "select",
  "where",
  "group",
  "order",
  "join",
  "insert",
  "update",
  "delete",
]);

const NOME = /[A-Za-z_]/;
const NOME_RESTO = /[A-Za-z0-9_]/;
const DIGITO = /[0-9]/;

function ehNome(char: string | undefined): boolean {
  return char !== undefined && NOME_RESTO.test(char);
}

/** Onde a linha termina, ou o fim do texto. */
function fimDaLinha(codigo: string, de: number): number {
  const quebra = codigo.indexOf("\n", de);

  return quebra === -1 ? codigo.length : quebra;
}

/**
 * O fim da string aberta em `de`, delimitador incluído.
 *
 * Aspa simples ou dupla fecha na mesma linha: código copiado pela metade não
 * pode apagar o resto do bloco. Três aspas atravessam linhas, como a docstring
 * do Python, e aí o não fechamento vale até o fim do texto.
 */
function fimDaString(codigo: string, de: number, marca: string): number {
  const limite = marca.length === 3 ? codigo.length : fimDaLinha(codigo, de);
  let i = de + marca.length;

  while (i < limite) {
    if (codigo[i] === "\\") {
      i += 2;
      continue;
    }

    if (codigo.startsWith(marca, i)) return i + marca.length;

    i += 1;
  }

  return limite;
}

export function realcarCodigo(codigo: string): Trecho[] {
  const trechos: Trecho[] = [];
  let comum = "";

  const guardar = (classe: Classe, texto: string): void => {
    if (comum !== "") {
      trechos.push({ classe: null, texto: comum });
      comum = "";
    }

    trechos.push({ classe, texto });
  };

  let i = 0;

  while (i < codigo.length) {
    const char = codigo[i] as string;

    if (char === "#" || codigo.startsWith("//", i)) {
      const fim = fimDaLinha(codigo, i);
      guardar("comentario", codigo.slice(i, fim));
      i = fim;
      continue;
    }

    if (char === '"' || char === "'") {
      const marca = codigo.startsWith(char.repeat(3), i)
        ? char.repeat(3)
        : char;
      const fim = fimDaString(codigo, i, marca);
      guardar("texto", codigo.slice(i, fim));
      i = fim;
      continue;
    }

    if (NOME.test(char)) {
      let fim = i + 1;
      while (ehNome(codigo[fim])) fim += 1;

      const palavra = codigo.slice(i, fim);

      if (CHAVES.has(palavra)) guardar("chave", palavra);
      else comum += palavra;

      i = fim;
      continue;
    }

    // Dígito depois de letra é parte do nome, e o nome já foi consumido pelo
    // caso acima — aqui o dígito só pode abrir um número.
    if (DIGITO.test(char)) {
      let fim = i + 1;
      while (
        codigo[fim] !== undefined &&
        (DIGITO.test(codigo[fim] as string) || codigo[fim] === ".")
      ) {
        fim += 1;
      }

      guardar("numero", codigo.slice(i, fim));
      i = fim;
      continue;
    }

    comum += char;
    i += 1;
  }

  if (comum !== "") trechos.push({ classe: null, texto: comum });

  return trechos;
}
