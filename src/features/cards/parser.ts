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

/**
 * Uma reclamação do parser. `title` é a causa em uma frase curta — o alerta do
 * editor compõe "Card não criado: {title} na linha {line}" e mostra `message`
 * como corpo. As duas frases moram aqui, e não na tela, porque é aqui que o
 * teste as alcança.
 */
export type ParseIssue = { line: number; title: string; message: string };

/**
 * SPEC §3.3 descreve `parse(markdown): ParsedCard[]`, mas também manda a
 * lacuna vazia virar "erro de validação reportado na UI, não silêncio" — e o
 * estilo do projeto proíbe devolver erro por throw. Daí as duas listas.
 */
export type ParseResult = { cards: ParsedCard[]; issues: ParseIssue[] };

const ABRE = "{{";
const FECHA = "}}";
const DICA = "::";

export type Varredura = {
  lacunas: Lacuna[];
  /** Lacunas escritas no destino de um link, que não viram card. */
  emDestino: Lacuna[];
  naoFecha: boolean;
};

export type Lacuna = { inicio: number; fim: number; conteudo: string };

type Trecho = { inicio: number; fim: number };

/**
 * Os destinos de link do texto: o que vem entre `](` e o `)` que o fecha,
 * título incluído.
 *
 * O Markdown não trata esse trecho como texto, e é por isso que ele é medido
 * aqui: a lacuna recortada de dentro dele deixaria o `href` apontando para
 * nada, com o card exibindo um link quebrado e nada na tela acusando. Mesma
 * família da marca injetada onde o Markdown não lê texto.
 *
 * Os parênteses são contados para que um destino com parêntese interno não
 * feche antes da hora, e a barra invertida escapa o caractere seguinte — as
 * mesmas duas regras de `varrer`. Destino que não fecha vale até o fim do
 * texto: dentro dele ainda não há texto para o Markdown.
 */
function destinosDeLink(texto: string): Trecho[] {
  const achados: Trecho[] = [];
  let i = 0;

  while (i < texto.length) {
    if (texto[i] === "\\") {
      i += 2;
      continue;
    }

    if (!texto.startsWith("](", i)) {
      i += 1;
      continue;
    }

    const inicio = i + "](".length;
    let j = inicio;
    let profundidade = 0;

    while (j < texto.length) {
      const char = texto[j];

      if (char === "\\") {
        j += 2;
        continue;
      }

      if (char === "(") profundidade += 1;
      else if (char === ")") {
        if (profundidade === 0) break;
        profundidade -= 1;
      }

      j += 1;
    }

    achados.push({ inicio, fim: j });
    i = j + 1;
  }

  return achados;
}

function dentro(trechos: Trecho[], posicao: number): boolean {
  return trechos.some(
    (trecho) => posicao >= trecho.inicio && posicao < trecho.fim,
  );
}

/**
 * Acha as lacunas de um texto. A profundidade de chaves simples é contada para
 * que `}}` dentro de LaTeX aninhado não feche a lacuna antes da hora, e a
 * barra invertida sempre escapa o caractere seguinte — é isso que faz a chave
 * dupla escapada virar texto literal em vez de lacuna.
 */
export function varrer(texto: string): Varredura {
  const lacunas: Lacuna[] = [];
  const emDestino: Lacuna[] = [];
  const destinos = destinosDeLink(texto);
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

    const lacuna = {
      inicio: i,
      fim: fim + FECHA.length,
      conteudo: texto.slice(i + ABRE.length, fim),
    };

    // No destino de link a lacuna não é lacuna: fica literal, e quem reclama
    // dela é `lerCloze`. Separar aqui faz `parse`, `posicoesDeCards` e
    // `lacunasVazias` concordarem sem cada um repetir a conta.
    if (dentro(destinos, lacuna.inicio)) emDestino.push(lacuna);
    else lacunas.push(lacuna);

    i = fim + FECHA.length;
  }

  return { lacunas, emDestino, naoFecha };
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
  const { lacunas, emDestino, naoFecha } = varrer(texto);

  emDestino.forEach((lacuna) => {
    reclamar({
      line: linhaDe(texto, lacuna.inicio, bloco.primeiraLinha),
      title: "lacuna no destino de link",
      message:
        "A lacuna está no destino de um link, onde o Markdown não lê texto. " +
        "Tire-a de dentro dos parênteses, ou escape a abertura para deixá-la " +
        "literal. O resto da nota está salvo.",
    });
  });

  if (naoFecha) {
    reclamar({
      line: bloco.primeiraLinha,
      title: "lacuna que não fecha",
      message:
        "Uma lacuna abre e não fecha. Feche com as duas chaves ou escape a abertura para deixá-la literal.",
    });
  }

  const validas = lacunas.filter((lacuna) => {
    if (lacuna.conteudo.trim() !== "") return true;

    reclamar({
      line: linhaDe(texto, lacuna.inicio, bloco.primeiraLinha),
      title: "lacuna vazia",
      message:
        "A marcação de lacuna vazia não tem resposta. Escreva a resposta " +
        "entre as chaves, ou apague a marcação. O resto da nota está salvo.",
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

const Q = "Q::";
const A = "A::";

/**
 * O par lido de um bloco que começa por `Q::`, ou por que ele não vira card.
 *
 * Mora numa função só porque dois leitores dependem desta mesma decisão: `lerQA`,
 * que emite o card, e `posicoesDeCards`, que marca a pergunta e a resposta no
 * corpo da nota. Em duas cópias, um `Q::` sem `A::` viraria bloco na tela sem
 * virar card — a tela prometeria um card que não existe.
 */
type Par =
  | { ok: true; pergunta: string; corpo: string }
  | { ok: false; motivo: "sem-resposta" | "vazio" };

function lerPar(linhas: string[]): Par {
  const pergunta = (linhas[0] ?? "").slice(Q.length).trim();
  const respostas = linhas.slice(1);
  const primeiraResposta = respostas[0];

  if (primeiraResposta === undefined || !primeiraResposta.startsWith(A)) {
    return { ok: false, motivo: "sem-resposta" };
  }

  const corpo = [
    primeiraResposta.slice(A.length).trim(),
    ...respostas.slice(1).map((linha) => linha.trimEnd()),
  ]
    .join("\n")
    .trim();

  if (pergunta === "" || corpo === "") return { ok: false, motivo: "vazio" };

  return { ok: true, pergunta, corpo };
}

function lerQA(
  linhas: string[],
  primeiraLinha: number,
  emitir: Emitir,
  reclamar: Reclamar,
): void {
  const par = lerPar(linhas);

  if (!par.ok) {
    reclamar(
      par.motivo === "sem-resposta"
        ? {
            line: primeiraLinha,
            title: "pergunta sem resposta",
            message:
              "Pergunta sem resposta: escreva A:: na linha seguinte ao Q::.",
          }
        : {
            line: primeiraLinha,
            title: "pergunta ou resposta vazia",
            message: "Pergunta ou resposta vazia: Q:: e A:: precisam de texto.",
          },
    );
    return;
  }

  const { pergunta, corpo } = par;

  emitir({
    kind: "qa",
    prompt: desescapar(pergunta),
    answer: desescapar(corpo),
    hint: null,
    line: primeiraLinha,
  });
}

type Partes = { cloze: Bloco | null; qa: Bloco | null };

/**
 * Como um bloco se divide entre os dois leitores. O `Q::` corta: o que vem
 * antes dele ainda é cloze, o que vem depois é pergunta e resposta.
 *
 * `lacunasVazias` depende desta mesma divisão — marcar na pré-visualização uma
 * lacuna que o parser não lê seria apontar um erro que a tela não reporta.
 */
function partirBloco(bloco: Bloco): Partes {
  const corte = bloco.linhas.findIndex((linha) => linha.startsWith("Q::"));

  if (corte === -1) return { cloze: bloco, qa: null };

  return {
    cloze:
      corte > 0
        ? { linhas: bloco.linhas.slice(0, corte), primeiraLinha: bloco.primeiraLinha }
        : null,
    qa: {
      linhas: bloco.linhas.slice(corte),
      primeiraLinha: bloco.primeiraLinha + corte,
    },
  };
}

/** Onde começa cada linha da nota: índice da linha base 0 → posição no texto. */
function inicioDasLinhas(markdown: string): number[] {
  const inicios: number[] = [];
  let soma = 0;

  for (const linha of markdown.split("\n")) {
    inicios.push(soma);
    soma += linha.length + 1;
  }

  return inicios;
}

/** Uma lacuna vazia pela posição no texto inteiro, não no bloco. */
export type LacunaVazia = { inicio: number; fim: number; line: number };

/**
 * Onde estão as lacunas vazias da nota. É a mesma varredura que gera a
 * reclamação de `parse` — e por isso a pré-visualização marca exatamente os
 * trechos que o alerta reporta, nem um a mais.
 *
 * `inicio` e `fim` recortam o `{{}}` inteiro, abertura e fechamento incluídos.
 */
export function lacunasVazias(markdown: string): LacunaVazia[] {
  const inicios = inicioDasLinhas(markdown);
  const achadas: LacunaVazia[] = [];

  for (const bloco of blocos(markdown)) {
    const { cloze } = partirBloco(bloco);

    if (cloze === null) continue;

    const texto = cloze.linhas.join("\n");
    const base = inicios[cloze.primeiraLinha - 1] ?? 0;

    for (const lacuna of varrer(texto).lacunas) {
      if (lacuna.conteudo.trim() !== "") continue;

      achadas.push({
        inicio: base + lacuna.inicio,
        fim: base + lacuna.fim,
        line: linhaDe(texto, lacuna.inicio, cloze.primeiraLinha),
      });
    }
  }

  return achadas;
}

/**
 * Onde cada card está escrito no texto da nota, com o ordinal que ele terá.
 *
 * É o que a leitura precisa para sublinhar a lacuna e numerar o sobrescrito
 * `#cN`: os recortes são do texto inteiro, não do bloco. Na lacuna, `inicio` e
 * `fim` cercam o `{{…}}` todo e `answer` é o que entra no lugar; no par, os dois
 * recortes são os tokens `Q::` e `A::`, que somem da tela e dão lugar aos
 * rótulos.
 *
 * A ordem e o ordinal são os de `parse` porque a varredura é a mesma, bloco a
 * bloco, lacunas antes do par. Divergir aqui faria o sobrescrito apontar para o
 * card errado, sem nada na tela acusando — por isso `body-marks.test.ts` compara
 * as duas listas.
 */
export type PosicaoCard =
  | {
      kind: "cloze";
      ordinal: number;
      inicio: number;
      fim: number;
      answer: string;
    }
  | {
      kind: "qa";
      ordinal: number;
      pergunta: { inicio: number; fim: number };
      resposta: { inicio: number; fim: number };
    };

export function posicoesDeCards(markdown: string): PosicaoCard[] {
  const inicios = inicioDasLinhas(markdown);
  const achadas: PosicaoCard[] = [];

  for (const bloco of blocos(markdown)) {
    const { cloze, qa } = partirBloco(bloco);

    if (cloze !== null) {
      const texto = cloze.linhas.join("\n");
      const base = inicios[cloze.primeiraLinha - 1] ?? 0;

      for (const lacuna of varrer(texto).lacunas) {
        if (lacuna.conteudo.trim() === "") continue;

        achadas.push({
          kind: "cloze",
          ordinal: achadas.length,
          inicio: base + lacuna.inicio,
          fim: base + lacuna.fim,
          answer: partir(lacuna.conteudo).answer,
        });
      }
    }

    if (qa === null || !lerPar(qa.linhas).ok) continue;

    const daPergunta = inicios[qa.primeiraLinha - 1] ?? 0;
    const daResposta = inicios[qa.primeiraLinha] ?? 0;

    achadas.push({
      kind: "qa",
      ordinal: achadas.length,
      pergunta: { inicio: daPergunta, fim: daPergunta + Q.length },
      resposta: { inicio: daResposta, fim: daResposta + A.length },
    });
  }

  return achadas;
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
    const { cloze, qa } = partirBloco(bloco);

    if (cloze !== null) lerCloze(cloze, emitir, reclamar);
    if (qa !== null) lerQA(qa.linhas, qa.primeiraLinha, emitir, reclamar);
  }

  return { cards, issues };
}
