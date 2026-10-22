// A lacuna e o par Pergunta/Resposta como elementos no corpo da nota.
//
// Terceira dupla do mesmo desenho dos vizinhos (`markdown-cloze.ts`,
// `markdown-empty-gap.ts`): aqui o plugin que monta os elementos, em
// `cards/body-marks.ts` a cirurgia na string que diz onde eles entram — e lá,
// porque onde está um card é conhecimento do parser.
//
// O handoff pede duas coisas que o Markdown não tem como dizer:
//
// - a lacuna aparece com a resposta à vista, sublinhada por um pontilhado de
//   1px, e o número do card em sobrescrito, linkando a âncora `#cN` da margem;
// - o par `Q::`/`A::` vira um bloco com filetes em cima e embaixo e os rótulos
//   "Pergunta" e "Resposta" numa coluna estreita — a sintaxe não aparece.
//
// Sem isto a marcação sai literal na tela: `shared/markdown.tsx` não tem
// `rehype-raw`, então HTML no Markdown sairia escapado, e um `replace` na
// string não alcança o que o Markdown já virou árvore.
//
// Os tipos do hast são estruturais de propósito, como nos módulos vizinhos:
// `@types/hast` é dependência fora do SPEC.

import type { No, Raiz } from "./markdown-cloze";

/* Área de uso privado do Unicode, os degraus seguintes ao par do cloze e à
   marca de lacuna vazia: não aparecem em nota nenhuma e sobrevivem ao Markdown
   como texto comum em vez de virar sintaxe. */
export const marcasDeCard = {
  /** Abre o trecho da lacuna. */
  lacuna: "",
  /** Fecha o trecho da lacuna; os dígitos do número vêm logo depois. */
  fecha: "",
  /** Fecha os dígitos do número do card. */
  numero: "",
  /** Começo da pergunta do par `Q::`/`A::`; os dígitos vêm logo depois. */
  pergunta: "",
  /** Começo da resposta do par. */
  resposta: "",
} as const;

const TODAS = new RegExp(`[${Object.values(marcasDeCard).join("")}]`, "g");

type Achado = { indice: number; posicao: number; valor: string };

/** Onde está uma marca entre os filhos de um nó, se estiver neste nível. */
function acharMarca(filhos: No[], marca: string): Achado | null {
  for (const [indice, filho] of filhos.entries()) {
    const valor = filho.value;

    if (filho.type !== "text" || valor === undefined) continue;

    const posicao = valor.indexOf(marca);

    if (posicao !== -1) return { indice, posicao, valor };
  }

  return null;
}

/** Nó de texto só quando há texto: `""` viraria nó vazio na árvore. */
function texto(valor: string): No[] {
  return valor === "" ? [] : [{ type: "text", value: valor }];
}

function elemento(
  tagName: string,
  className: string | null,
  children: No[],
  properties: Record<string, unknown> = {},
): No {
  return {
    type: "element",
    tagName,
    properties:
      className === null
        ? properties
        : { className: [className], ...properties },
    children,
  };
}

/** O sobrescrito que leva ao card: `1` aponta para `#c1`. */
function referencia(numero: string): No {
  return elemento("a", "note-ref", [{ type: "text", value: numero }], {
    href: `#c${numero}`,
  });
}

/** Os dígitos do número do card a partir de uma marca, e onde eles terminam. */
function lerNumero(
  valor: string,
  depoisDaMarca: number,
): { numero: string; resto: number } | null {
  const fim = valor.indexOf(marcasDeCard.numero, depoisDaMarca);

  if (fim === -1) return null;

  const numero = valor.slice(depoisDaMarca, fim);

  if (!/^\d+$/.test(numero)) return null;

  return { numero, resto: fim + marcasDeCard.numero.length };
}

/* ─────────────────────────────── a lacuna ────────────────────────────── */

/**
 * Os filhos com o trecho entre as marcas dentro de um `span`, seguido do
 * sobrescrito — ou `null` se o par não está neste nível.
 *
 * O trecho pode atravessar irmãos (a resposta `$\frac{a}{b}$` vira um elemento
 * do KaTeX entre dois nós de texto), por isso o corte é por índice e posição, e
 * não um `replace` num nó só. É a mesma travessia de `markdown-cloze.ts`; o que
 * muda é o que entra no lugar.
 */
function envolverLacuna(filhos: No[]): No[] | null {
  const abre = acharMarca(filhos, marcasDeCard.lacuna);
  const fecha = acharMarca(filhos, marcasDeCard.fecha);

  if (abre === null || fecha === null) return null;

  const lido = lerNumero(
    fecha.valor,
    fecha.posicao + marcasDeCard.fecha.length,
  );

  if (lido === null) return null;

  const dentro =
    abre.indice === fecha.indice
      ? texto(
          abre.valor.slice(
            abre.posicao + marcasDeCard.lacuna.length,
            fecha.posicao,
          ),
        )
      : [
          ...texto(abre.valor.slice(abre.posicao + marcasDeCard.lacuna.length)),
          ...filhos.slice(abre.indice + 1, fecha.indice),
          ...texto(fecha.valor.slice(0, fecha.posicao)),
        ];

  return [
    ...filhos.slice(0, abre.indice),
    ...texto(abre.valor.slice(0, abre.posicao)),
    elemento("span", "note-cloze", dentro),
    referencia(lido.numero),
    ...texto(fecha.valor.slice(lido.resto)),
    ...filhos.slice(fecha.indice + 1),
  ];
}

function percorrerLacunas(no: No): void {
  const filhos = no.children;

  if (filhos === undefined) return;

  // Em laço, não uma vez: um parágrafo pode ter duas lacunas, e cada volta
  // envolve a primeira que ainda estiver crua.
  let atuais = filhos;
  let novos = envolverLacuna(atuais);

  while (novos !== null) {
    atuais = novos;
    novos = envolverLacuna(atuais);
  }

  no.children = atuais;
  atuais.forEach(percorrerLacunas);
}

/* ────────────────────────── pergunta e resposta ──────────────────────── */

/** Espaço em branco nas pontas não vira célula da grade. */
function aparar(filhos: No[]): No[] {
  const vazio = (no: No | undefined): boolean =>
    no !== undefined && no.type === "text" && (no.value ?? "").trim() === "";

  let inicio = 0;
  let fim = filhos.length;

  while (inicio < fim && vazio(filhos[inicio])) inicio += 1;
  while (fim > inicio && vazio(filhos[fim - 1])) fim -= 1;

  return filhos.slice(inicio, fim);
}

/**
 * As quatro células do bloco Pergunta/Resposta e o que vinha antes dele, ou
 * `null` se as marcas não estão neste nível.
 *
 * O `Q::` e o `A::` são linhas vizinhas, então o Markdown as entrega no mesmo
 * parágrafo, separadas por uma quebra leve — é por isso que a divisão é entre
 * os filhos de um nó, e não entre nós de topo. E o parágrafo pode começar antes
 * do `Q::`: um bloco de nota tem lacunas e, nas linhas seguintes, o par. Esse
 * começo é devolvido em `antes` para continuar sendo um parágrafo — jogá-lo
 * fora apagava da tela o trecho com as lacunas.
 */
function montarQA(
  filhos: No[],
): { antes: No[]; celulas: No[] } | null {
  const abre = acharMarca(filhos, marcasDeCard.pergunta);

  if (abre === null) return null;

  const lido = lerNumero(
    abre.valor,
    abre.posicao + marcasDeCard.pergunta.length,
  );

  if (lido === null) return null;

  const corte = acharMarca(filhos, marcasDeCard.resposta);

  if (corte === null) return null;

  const pergunta =
    abre.indice === corte.indice
      ? texto(abre.valor.slice(lido.resto, corte.posicao))
      : [
          ...texto(abre.valor.slice(lido.resto)),
          ...filhos.slice(abre.indice + 1, corte.indice),
          ...texto(corte.valor.slice(0, corte.posicao)),
        ];

  const resposta = [
    ...texto(corte.valor.slice(corte.posicao + marcasDeCard.resposta.length)),
    ...filhos.slice(corte.indice + 1),
  ];

  return {
    antes: [
      ...filhos.slice(0, abre.indice),
      ...texto(abre.valor.slice(0, abre.posicao)),
    ],
    celulas: [
      elemento("span", "note-qa-rotulo", [
        { type: "text", value: "Pergunta" },
        referencia(lido.numero),
      ]),
      elemento("span", null, aparar(pergunta)),
      elemento("span", "note-qa-rotulo", [{ type: "text", value: "Resposta" }]),
      elemento("span", null, aparar(resposta)),
    ],
  };
}

/** Quantas quebras de linha há no texto destes nós, descendentes incluídos. */
function quebras(nos: No[]): number {
  return nos.reduce(
    (total, no) =>
      total +
      (no.value ?? "").split("\n").length -
      1 +
      quebras(no.children ?? []),
    0,
  );
}

/**
 * O elemento que carrega o par, trocado pelo bloco da grade — e pelo parágrafo
 * do que vinha antes dele, quando havia. `div`, e não `p`: o conteúdo é uma
 * grade de quatro células, e `p` não pode conter bloco.
 *
 * O bloco novo herda a posição do parágrafo, adiantada pelas quebras de linha
 * que ficaram para trás: ele começa na linha do `Q::`. É por essa linha que
 * `cards/by-block.ts` decide em que linha da grade o card entra — sem ela, o
 * card do par aparecia ao lado do trecho anterior.
 */
function partirElementoQA(no: No): No[] | null {
  const filhos = no.children;

  if (no.type !== "element" || filhos === undefined) return null;

  const montado = montarQA(filhos);

  if (montado === null) return null;

  const linha = no.position?.start?.line;
  const bloco = elemento("div", "note-qa", montado.celulas);
  const antes = aparar(montado.antes);

  if (linha !== undefined) {
    bloco.position = { start: { line: linha + quebras(montado.antes) } };
  }

  return antes.length === 0 ? [bloco] : [{ ...no, children: antes }, bloco];
}

/** Troca, entre os filhos de um nó, cada elemento que carrega um par. */
function trocarQA(no: No): void {
  const filhos = no.children;

  if (filhos === undefined) return;

  const novos: No[] = [];
  let mudou = false;

  for (const filho of filhos) {
    const partes = partirElementoQA(filho);

    if (partes === null) {
      trocarQA(filho);
      novos.push(filho);
      continue;
    }

    mudou = true;
    novos.push(...partes);
  }

  if (mudou) no.children = novos;
}

/**
 * Sobra de marca nunca deveria existir — são escritas em par —, mas se o
 * Markdown separar o par em nós que não são irmãos, o usuário veria um
 * caractere fantasma no meio da frase. Melhor o sublinhado faltar.
 *
 * A limpeza inclui os atributos, e não só o texto: lacuna escrita dentro de
 * uma fórmula (`$x = {{2}}$`, a aninhação ao contrário da que SPEC §3.1
 * prescreve) faz o KaTeX devolver um nó de erro com o trecho copiado para o
 * `title` — e de lá a marca iria para o DOM.
 */
function limparValor(valor: unknown): unknown {
  return typeof valor === "string" ? valor.replace(TODAS, "") : valor;
}

function limpar(no: No): void {
  if (no.value !== undefined) no.value = no.value.replace(TODAS, "");

  const propriedades = no.properties;

  if (propriedades !== undefined) {
    no.properties = Object.fromEntries(
      Object.entries(propriedades).map(([chave, valor]) => [
        chave,
        limparValor(valor),
      ]),
    );
  }

  no.children?.forEach(limpar);
}

/** Plugin de rehype: as marcas de `marcarCardsNoCorpo` viram elementos. */
export function envolverCards() {
  return () =>
    (tree: Raiz): void => {
      trocarQA(tree);
      percorrerLacunas(tree);
      limpar(tree);
    };
}
