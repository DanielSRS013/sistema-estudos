// Varredura de cerca de código: separa o Markdown em parágrafos cujo conteúdo
// conta, deixando de fora tudo que está dentro de ``` ou ~~~.
//
// Vive em `shared` porque duas features dependem dela: `cards/parser.ts`, que
// não pode transformar exemplo de sintaxe nem código Python em card, e
// `tags/extract.ts`, que não pode transformar `# comentário` de Python em tag.
// Duas cópias desta função divergiriam, e a divergência apareceria como card
// ou tag fantasma dentro de um bloco de código — silenciosamente.

/** Abertura ou fechamento de bloco de código cercado. */
const CERCA = /^\s{0,3}([`]{3,}|~{3,})/;

/**
 * Recuo que faz bloco de código indentado: quatro espaços ou uma tabulação.
 *
 * O bloco indentado é código tanto quanto o cercado, e o Markdown o renderiza
 * dentro de um `<pre>`. Lido como parágrafo, ele virava card do exemplo de
 * sintaxe e as marcas da lacuna apareciam no meio do código.
 */
const RECUO = /^(?: {4}|\t)/;

/**
 * Abertura de item de lista, com o recuo de até três espaços que o CommonMark
 * admite antes da marca.
 *
 * Com lista aberta, o recuo de quatro espaços é conteúdo do item — segundo
 * parágrafo, sublista — e não bloco de código: o Markdown o renderiza dentro
 * do `<li>`. Lido como código, a lacuna e a tag escritas ali desapareciam sem
 * reclamação nenhuma, e a nota perdia card e vínculo com o conceito em
 * silêncio.
 */
const ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:\s|$)/;

export type Bloco = {
  linhas: string[];
  /** Linha da nota onde o bloco começa, base 1. As linhas são contíguas. */
  primeiraLinha: number;
};

/** Parágrafos fora de bloco de código cercado, com a linha de origem. */
export function blocos(markdown: string): Bloco[] {
  const linhas = markdown.split("\n");
  const encontrados: Bloco[] = [];

  let atual: Bloco | null = null;
  // Cerca aberta: guarda o caractere e o comprimento, porque o fechamento
  // precisa ser pelo menos tão longo quanto a abertura.
  let cerca: { char: string; tamanho: number } | null = null;
  // Bloco indentado aberto. Não guarda nada além do estado: o fechamento é a
  // primeira linha que não é recuada nem em branco.
  let recuado = false;
  // Lista aberta: a última linha sem recuo era marca de item.
  let listaAberta = false;

  const fechaBloco = () => {
    if (atual) encontrados.push(atual);
    atual = null;
  };

  linhas.forEach((linha, indice) => {
    const marca = CERCA.exec(linha)?.[1];

    if (cerca) {
      // Dentro da cerca nada vira card — nem exemplo de sintaxe, nem Python.
      if (marca && marca.startsWith(cerca.char) && marca.length >= cerca.tamanho) {
        cerca = null;
      }
      return;
    }

    if (recuado) {
      // Linha em branco não fecha o bloco indentado: o recuo que vem depois
      // dela continua o mesmo código. Fecha a primeira linha sem recuo.
      if (linha.trim() === "" || RECUO.test(linha)) return;
      recuado = false;
    }

    if (marca) {
      fechaBloco();
      cerca = { char: marca.slice(0, 1), tamanho: marca.length };
      return;
    }

    const recuada = RECUO.test(linha);
    const vazia = linha.trim() === "";

    // Marca de lista abre o contexto de lista; linha de texto sem recuo o
    // fecha. Linha em branco não fecha — é ela que separa os parágrafos de uma
    // lista solta.
    if (!recuada && !vazia) listaAberta = ITEM.test(linha);

    // Bloco indentado não interrompe parágrafo (CommonMark): com bloco aberto,
    // a linha recuada é continuação, e o que está nela ainda conta. Dentro de
    // lista o recuo também não é código, e sim conteúdo do item.
    if (atual === null && recuada && !listaAberta) {
      recuado = true;
      return;
    }

    if (vazia) {
      fechaBloco();
      return;
    }

    if (atual) {
      atual.linhas.push(linha);
    } else {
      atual = { linhas: [linha], primeiraLinha: indice + 1 };
    }
  });

  fechaBloco();

  return encontrados;
}
