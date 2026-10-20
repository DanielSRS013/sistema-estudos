// Tags inline da nota: `#projecao-vetorial`. Função pura, sem I/O e sem React
// — a gravação é de `sync.ts`, o link na leitura é do plugin de render.
//
// A tag é a identidade do conceito, então o slug é normalizado: `#Projeção`
// e `#projecao` são a mesma tag. O nome guardado é o que foi digitado na
// primeira ocorrência.

import { blocos } from "@/shared/markdown-blocks";
import { slugify } from "@/shared/slug";

export type ExtractedTag = {
  slug: string;
  /** Texto como foi digitado, sem a cerquilha. */
  name: string;
  /** Linha da nota onde a tag aparece, base 1. */
  line: number;
};

export type FoundTag = {
  inicio: number;
  fim: number;
  name: string;
  slug: string;
};

/** Caractere que pode compor o nome de uma tag. */
const CARACTERE = /[\p{L}\p{N}_-]/u;

/**
 * O que pode vir antes da cerquilha. Espaço ou início de linha é o caso
 * normal; abre-parênteses e aspas aparecem em texto corrido. Letra ou dígito
 * antes da cerquilha é o fragmento de URL (`/doc#secao`), que não é tag.
 */
const ANTES = /[\s([{"']/;

/**
 * Recorta as tags de um texto já livre de código e de LaTeX. Serve ao render,
 * que precisa das posições para trocar o trecho por um link.
 *
 * A barra invertida escapa a cerquilha seguinte, como `\{{` escapa a lacuna
 * no parser de cards.
 */
export function findTags(texto: string): FoundTag[] {
  const achadas: FoundTag[] = [];
  let i = 0;

  while (i < texto.length) {
    if (texto[i] === "\\") {
      i += 2;
      continue;
    }

    if (texto[i] !== "#") {
      i += 1;
      continue;
    }

    const anterior = i === 0 ? undefined : texto[i - 1];

    if (anterior !== undefined && !ANTES.test(anterior)) {
      i += 1;
      continue;
    }

    let fim = i + 1;

    while (fim < texto.length) {
      const char = texto[fim];
      if (char === undefined || !CARACTERE.test(char)) break;
      fim += 1;
    }

    // Hífen e sublinhado de borda ficam fora: em "#norma-" o nome é "norma".
    const name = texto.slice(i + 1, fim).replace(/[-_]+$/, "");
    const slug = slugify(name);

    if (name === "" || slug === "") {
      i += 1;
      continue;
    }

    achadas.push({ inicio: i, fim: i + 1 + name.length, name, slug });
    i = fim;
  }

  return achadas;
}

/** Espaço no lugar do trecho, preservando posição e quebra de linha. */
function apagar(chars: string[], de: number, ate: number): void {
  for (let i = de; i < ate && i < chars.length; i += 1) {
    if (chars[i] !== "\n") chars[i] = " ";
  }
}

/** Fim do delimitador igual ao de abertura, ou -1 se ele não fecha. */
function fechamento(texto: string, marca: string, de: number): number {
  let i = de;

  while (i < texto.length) {
    if (texto[i] === "\\") {
      i += 2;
      continue;
    }

    if (texto.startsWith(marca, i)) return i + marca.length;

    i += 1;
  }

  return -1;
}

/** Link em linha, cujo rótulo e destino não devem virar tag. */
const LINK = /\[[^\]\n]*\]\([^)\n]*\)/g;

/**
 * Apaga código inline, LaTeX e link do texto, mantendo o tamanho. Sem isso, o
 * `# comentário` de um exemplo em Python e o `#1` de uma macro TeX viravam
 * tag, e uma tag dentro de rótulo de link viraria link dentro de link.
 * Delimitador que não fecha é texto literal e fica como está.
 */
function mascararEmLinha(texto: string): string {
  const chars = [...texto];
  let i = 0;

  while (i < texto.length) {
    if (texto[i] === "\\") {
      i += 2;
      continue;
    }

    const cerquilha = texto[i] === "`";
    const dolar = texto[i] === "$";

    if (!cerquilha && !dolar) {
      i += 1;
      continue;
    }

    // Em código inline o fechamento tem exatamente o mesmo número de acentos
    // graves da abertura; em LaTeX, `$$` fecha com `$$` e `$` com `$`.
    let marca = texto[i] as string;

    if (cerquilha) {
      while (texto[i + marca.length] === "`") marca += "`";
    } else if (texto.startsWith("$$", i)) {
      marca = "$$";
    }

    const fim = fechamento(texto, marca, i + marca.length);

    if (fim === -1) {
      i += marca.length;
      continue;
    }

    apagar(chars, i, fim);
    i = fim;
  }

  const semDelimitador = chars.join("");
  const comLink = [...semDelimitador];

  for (const achado of semDelimitador.matchAll(LINK)) {
    apagar(comLink, achado.index, achado.index + achado[0].length);
  }

  return comLink.join("");
}

/**
 * O documento com tudo que não é texto corrido apagado, no mesmo tamanho do
 * original — as posições continuam valendo para quem vai recortar.
 *
 * A autoridade sobre cerca de código é `blocos`, a mesma que o parser de
 * cards usa: linha que não saiu num bloco é linha que não conta.
 */
export function mascarar(markdown: string): string {
  const linhas = markdown.split("\n");
  const corridas = new Set<number>();

  for (const bloco of blocos(markdown)) {
    bloco.linhas.forEach((_, i) => corridas.add(bloco.primeiraLinha + i));
  }

  const texto = linhas
    .map((linha, i) => (corridas.has(i + 1) ? linha : " ".repeat(linha.length)))
    .join("\n");

  return mascararEmLinha(texto);
}

function linhaDe(texto: string, posicao: number, base: number): number {
  return base + (texto.slice(0, posicao).match(/\n/g)?.length ?? 0);
}

/**
 * Tags da nota, na ordem do documento e sem repetição. Conteúdo dentro de
 * bloco de código cercado, de código inline, de LaTeX ou de link não conta —
 * é a mesma máscara que o render usa, para o que está escrito e o que fica
 * clicável nunca discordarem.
 */
export function extractTags(markdown: string): ExtractedTag[] {
  const porSlug = new Map<string, ExtractedTag>();

  for (const achada of findTags(mascarar(markdown))) {
    if (porSlug.has(achada.slug)) continue;

    porSlug.set(achada.slug, {
      slug: achada.slug,
      name: achada.name,
      line: linhaDe(markdown, achada.inicio, 1),
    });
  }

  return [...porSlug.values()];
}
