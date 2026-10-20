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

    if (marca) {
      fechaBloco();
      cerca = { char: marca.slice(0, 1), tamanho: marca.length };
      return;
    }

    if (linha.trim() === "") {
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
