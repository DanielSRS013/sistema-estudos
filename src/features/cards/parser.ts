// Markdown entra, cards saem. Função pura: sem I/O, sem banco, sem React.
// Implementa SPEC §3.1–§3.3. Bug silencioso aqui corrompe dado do usuário sem
// aviso — toda alteração vem com teste no mesmo commit.

import { blocos, type Bloco } from "@/shared/markdown-blocks";
import { LACUNA } from "@/shared/markdown-cloze";

export type CardKind = "cloze" | "qa";

export type ParsedCard = {
  kind: CardKind;
  /** Posição dentro da nota, na ordem do documento. Base 0. */
  ordinal: number;
  /** Frente do card. Na oclusão, a lacuna da vez vira `[…]`. */
  prompt: string;
  answer: string;
  hint: string | null;
  /** Linha da nota onde o card começa, base 1 — a margem aponta para lá. */
  line: number;
};

export type ParseIssue = { line: number; message: string };

/**
 * SPEC §3.3 descreve `parse(markdown): ParsedCard[]`, mas também manda a
 * lacuna vazia virar "erro de validação reportado na UI, não silêncio" — e o
 * estilo do projeto proíbe devolver erro por throw. Daí as duas listas.
 */
export type ParseResult = { cards: ParsedCard[]; issues: ParseIssue[] };

const ABRE = "{{";
const FECHA = "}}";
const DICA = "::";

type Lacuna = { inicio: number; fim: number; conteudo: string };

type Varredura = { lacunas: Lacuna[]; naoFecha: boolean };

/**
 * Acha as lacunas de um texto. A profundidade de chaves simples é contada para
 * que `}}` dentro de LaTeX aninhado não feche a lacuna antes da hora, e a
 * barra invertida sempre escapa o caractere seguinte — é isso que faz a chave
 * dupla escapada virar texto literal em vez de lacuna.
 */
function varrer(texto: string): Varredura {
  const lacunas: Lacuna[] = [];
  let naoFecha = false;
  let i = 0;

  while (i < texto.length) {
    if (texto[i] === "\\") {
      i += 2;
      continue;
    }

    if (!texto.startsWith(ABRE, i)) {
      i += 1;
      continue;
    }

    let j = i + ABRE.length;
    let profundidade = 0;
    let fim = -1;

    while (j < texto.length) {
      const char = texto[j];

      if (char === "\\") {
        j += 2;
        continue;
      }

      if (profundidade === 0 && texto.startsWith(FECHA, j)) {
        fim = j;
        break;
      }

      if (char === "{") profundidade += 1;
      else if (char === "}") profundidade -= 1;

      j += 1;
    }

    if (fim === -1) {
      // Lacuna aberta e não fechada: vira texto literal, e o resto do bloco
      // continua valendo. No meio da digitação é o caso normal.
      naoFecha = true;
      i += ABRE.length;
      continue;
    }

    lacunas.push({
      inicio: i,
      fim: fim + FECHA.length,
      conteudo: texto.slice(i + ABRE.length, fim),
    });

    i = fim + FECHA.length;
  }

  return { lacunas, naoFecha };
}

/** Espaços colapsados; o texto do card não guarda a quebra de linha da nota. */
function umaLinha(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

/** A chave dupla escapada é literal na nota: o card mostra as duas chaves. */
function desescapar(texto: string): string {
  return texto.replace(/\\\{\{/g, ABRE);
}

/** Resposta e dica de uma lacuna, separadas pelo primeiro `::` não escapado. */
function partir(conteudo: string): { answer: string; hint: string | null } {
  const corte = conteudo.search(/(?<!\\)::/);

  if (corte === -1) return { answer: umaLinha(conteudo), hint: null };

  const dica = umaLinha(conteudo.slice(corte + DICA.length));

  return {
    answer: umaLinha(conteudo.slice(0, corte)),
    hint: dica === "" ? null : dica,
  };
}

function linhaDe(texto: string, posicao: number, base: number): number {
  return base + (texto.slice(0, posicao).match(/\n/g)?.length ?? 0);
}

type Emitir = (card: Omit<ParsedCard, "ordinal">) => void;
type Reclamar = (issue: ParseIssue) => void;

function lerCloze(bloco: Bloco, emitir: Emitir, reclamar: Reclamar): void {
  const texto = bloco.linhas.join("\n");
  const { lacunas, naoFecha } = varrer(texto);

  if (naoFecha) {
    reclamar({
      line: bloco.primeiraLinha,
      message:
        "Uma lacuna abre e não fecha. Feche com as duas chaves ou escape a abertura para deixá-la literal.",
    });
  }

  const validas = lacunas.filter((lacuna) => {
    if (lacuna.conteudo.trim() !== "") return true;

    reclamar({
      line: linhaDe(texto, lacuna.inicio, bloco.primeiraLinha),
      message: "Lacuna vazia: não há resposta para esconder.",
    });

    return false;
  });

  validas.forEach((alvo) => {
    const { answer, hint } = partir(alvo.conteudo);

    // A frente mostra as outras lacunas resolvidas e esconde só a da vez.
    let prompt = "";
    let cursor = 0;

    for (const lacuna of validas) {
      prompt += texto.slice(cursor, lacuna.inicio);
      prompt += lacuna === alvo ? LACUNA : partir(lacuna.conteudo).answer;
      cursor = lacuna.fim;
    }

    prompt += texto.slice(cursor);

    emitir({
      kind: "cloze",
      prompt: desescapar(prompt).trim(),
      answer,
      hint,
      line: linhaDe(texto, alvo.inicio, bloco.primeiraLinha),
    });
  });
}

function lerQA(
  linhas: string[],
  primeiraLinha: number,
  emitir: Emitir,
  reclamar: Reclamar,
): void {
  const cabeca = linhas[0] ?? "";
  const pergunta = cabeca.slice("Q::".length).trim();
  const respostas = linhas.slice(1);
  const primeiraResposta = respostas[0];

  if (primeiraResposta === undefined || !primeiraResposta.startsWith("A::")) {
    reclamar({
      line: primeiraLinha,
      message: "Pergunta sem resposta: escreva A:: na linha seguinte ao Q::.",
    });
    return;
  }

  const corpo = [
    primeiraResposta.slice("A::".length).trim(),
    ...respostas.slice(1).map((linha) => linha.trimEnd()),
  ]
    .join("\n")
    .trim();

  if (pergunta === "" || corpo === "") {
    reclamar({
      line: primeiraLinha,
      message: "Pergunta ou resposta vazia: Q:: e A:: precisam de texto.",
    });
    return;
  }

  emitir({
    kind: "qa",
    prompt: desescapar(pergunta),
    answer: desescapar(corpo),
    hint: null,
    line: primeiraLinha,
  });
}

export function parse(markdown: string): ParseResult {
  const cards: ParsedCard[] = [];
  const issues: ParseIssue[] = [];

  const emitir: Emitir = (card) => {
    cards.push({ ...card, ordinal: cards.length });
  };
  const reclamar: Reclamar = (issue) => {
    issues.push(issue);
  };

  for (const bloco of blocos(markdown)) {
    const corte = bloco.linhas.findIndex((linha) => linha.startsWith("Q::"));

    if (corte === -1) {
      lerCloze(bloco, emitir, reclamar);
      continue;
    }

    if (corte > 0) {
      lerCloze(
        {
          linhas: bloco.linhas.slice(0, corte),
          primeiraLinha: bloco.primeiraLinha,
        },
        emitir,
        reclamar,
      );
    }

    lerQA(
      bloco.linhas.slice(corte),
      bloco.primeiraLinha + corte,
      emitir,
      reclamar,
    );
  }

  return { cards, issues };
}
