// Reconciliação de SPEC §3.4 — o requisito de segurança mais importante do
// sistema. Nenhuma edição de nota, por mais destrutiva, pode apagar semanas de
// histórico de revisão. Função pura: devolve um plano, não toca no banco.

import { createHash } from "node:crypto";

import type { CardKind, ParsedCard } from "./parser";

export type ExistingCard = {
  id: string;
  anchorKey: string;
  ordinal: number;
  prompt: string;
  answer: string;
  hint: string | null;
  archivedAt: Date | null;
};

/** Colunas de texto de um card — o estado do FSRS nunca passa por aqui. */
export type CardFields = {
  anchorKey: string;
  kind: CardKind;
  ordinal: number;
  prompt: string;
  answer: string;
  hint: string | null;
};

export type CardUpdate = CardFields & {
  id: string;
  unarchive: boolean;
  /** Âncora que o card tinha antes desta edição. */
  previousAnchorKey: string;
};

export type ReconcilePlan = {
  /** Cards que continuam valendo: texto e posição atualizados, estado intacto. */
  update: CardUpdate[];
  create: CardFields[];
  /** Ids a arquivar. Não existe "delete" neste plano, e isso é proposital. */
  archive: string[];
  /** Cards repetidos na mesma nota: só o primeiro entra, o resto é reportado. */
  duplicates: ParsedCard[];
};

/** Similaridade mínima para tratar duas versões como o mesmo card (§3.4.3). */
const LIMITE_SIMILARIDADE = 0.8;

/**
 * Pontuação de frase que não muda a identidade do card quando aparece na
 * borda. Colchete, parêntese e chave ficam de fora de propósito: `[…]` é a
 * marca da lacuna e `g(x)` termina em conteúdo, não em pontuação.
 */
const BORDA = String.raw`\s.,;:!?¡¿…—–\-"'“”‘’«»*_`;
const INICIO = new RegExp(`^[${BORDA}]+`, "u");
const FIM = new RegExp(`[${BORDA}]+$`, "u");

/**
 * Espaços colapsados e pontuação de borda fora. Mantém símbolos (`$`, `|`),
 * porque em nota de matemática eles são conteúdo, não pontuação.
 */
export function normalize(texto: string): string {
  return texto.replace(/\s+/g, " ").replace(INICIO, "").replace(FIM, "");
}

/**
 * Chave de identidade do card: SHA-256 de frente e verso normalizados e
 * separados por NUL, truncado em 16 bytes. O NUL impede que mover texto de um
 * lado para o outro gere a mesma chave.
 *
 * SPEC §3.4 escreve `normalize(prompt + NUL + answer)`. Normalizar cada lado
 * antes de juntar é o que cumpre a intenção do passo: assim o ponto final que
 * o usuário acrescenta ao fim da frase não inventa um card novo — normalizando
 * só a borda do todo, aquele ponto ficaria no meio da string e mudaria a
 * chave.
 */
export function anchorKey(prompt: string, answer: string): string {
  const base = `${normalize(prompt)}\u0000${normalize(answer)}`;

  return createHash("sha256").update(base, "utf8").digest("hex").slice(0, 32);
}

/** Distância de Levenshtein, iterativa com duas linhas. */
function distancia(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i, ...Array.from<number>({ length: b.length }).fill(0)];

    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;

      atual[j] = Math.min(
        (atual[j - 1] ?? 0) + 1,
        (anterior[j] ?? 0) + 1,
        (anterior[j - 1] ?? 0) + custo,
      );
    }

    anterior = atual;
  }

  return anterior[b.length] ?? 0;
}

/** Levenshtein normalizada: 1 é idêntico, 0 é sem nada em comum. */
export function similarity(a: string, b: string): number {
  const maior = Math.max(a.length, b.length);

  if (maior === 0) return 1;

  return 1 - distancia(a, b) / maior;
}

function camposDe(card: ParsedCard, chave: string): CardFields {
  return {
    anchorKey: chave,
    kind: card.kind,
    ordinal: card.ordinal,
    prompt: card.prompt,
    answer: card.answer,
    hint: card.hint,
  };
}

/**
 * Casa os cards recém-parseados com os que já estão na nota:
 *
 * 1. por `anchorKey` idêntica — inclusive a de um card arquivado, que volta;
 * 2. o que sobrar, por posição ordinal, se o prompt ainda for parecido;
 * 3. parseado sem par vira card novo;
 * 4. existente sem par é arquivado. Nunca apagado.
 */
export function reconcile(
  existing: ExistingCard[],
  parsed: ParsedCard[],
): ReconcilePlan {
  const update: ReconcilePlan["update"] = [];
  const create: CardFields[] = [];
  const duplicates: ParsedCard[] = [];

  const porChave = new Map<string, ExistingCard>();

  for (const card of existing) {
    if (!porChave.has(card.anchorKey)) porChave.set(card.anchorKey, card);
  }

  const usados = new Set<string>();
  const chavesVistas = new Set<string>();
  const sobras: { card: ParsedCard; chave: string }[] = [];

  // Passo 1 e 2: casamento exato por âncora.
  for (const card of parsed) {
    const chave = anchorKey(card.prompt, card.answer);

    // O índice único é (noteId, anchorKey): dois trechos idênticos na mesma
    // nota não podem virar duas linhas. O segundo é reportado, não gravado.
    if (chavesVistas.has(chave)) {
      duplicates.push(card);
      continue;
    }

    chavesVistas.add(chave);

    const encontrado = porChave.get(chave);

    if (encontrado && !usados.has(encontrado.id)) {
      usados.add(encontrado.id);
      update.push({
        ...camposDe(card, chave),
        id: encontrado.id,
        unarchive: encontrado.archivedAt !== null,
        previousAnchorKey: encontrado.anchorKey,
      });
      continue;
    }

    sobras.push({ card, chave });
  }

  // Passo 3: o que sobrou, por posição, se o texto ainda for reconhecível.
  for (const { card, chave } of sobras) {
    const candidato = existing.find(
      (velho) => velho.ordinal === card.ordinal && !usados.has(velho.id),
    );

    const parecido =
      candidato !== undefined &&
      similarity(normalize(candidato.prompt), normalize(card.prompt)) >=
        LIMITE_SIMILARIDADE;

    if (candidato && parecido) {
      usados.add(candidato.id);
      update.push({
        ...camposDe(card, chave),
        id: candidato.id,
        unarchive: candidato.archivedAt !== null,
        previousAnchorKey: candidato.anchorKey,
      });
      continue;
    }

    create.push(camposDe(card, chave));
  }

  // Passo 4: quem ficou sem par sai da fila, mas continua no banco com o
  // histórico inteiro — e volta sozinho se o trecho reaparecer.
  const archive = existing
    .filter((velho) => !usados.has(velho.id) && velho.archivedAt === null)
    .map((velho) => velho.id);

  return { update, create, archive, duplicates };
}

