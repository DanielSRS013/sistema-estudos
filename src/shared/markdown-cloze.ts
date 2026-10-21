// A lacuna do cloze como elemento, não como texto solto.
//
// O parser entrega a frente do card com a lacuna da vez marcada por `[…]`
// (SPEC §3.2) — texto puro dentro do Markdown, que nenhum seletor alcança. O
// handoff pede duas aparências para esse mesmo trecho: oculto, com filete de
// 2px por baixo; revelado, com a resposta no lugar e fundo `--rule`. As duas
// exigem um elemento.
//
// Daí as duas metades daqui: `marcarLacuna` cerca o trecho com dois caracteres
// de uso privado antes do Markdown ser lido, e `envolverLacuna` troca esse
// par por um `span` depois da árvore pronta. O caminho é esse, e não HTML na
// saída do parser, por dois motivos: `prompt` é dado gravado no banco, e
// mudar o formato dele deixaria os cards antigos com uma marcação e os novos
// com outra até a nota ser salva de novo; e o render não tem `rehype-raw`,
// então HTML no Markdown sairia escapado na tela.
//
// Os tipos do hast são estruturais de propósito, como em `markdown-lines.ts`:
// `@types/hast` é dependência fora do SPEC e aqui só três campos interessam.

/** Marca da lacuna na frente do card. O parser escreve esta mesma string. */
export const LACUNA = "[…]";

/* Área de uso privado do Unicode: não aparecem em nota nenhuma, e sobrevivem
   ao Markdown como texto comum em vez de virar sintaxe. */
const INICIO = "";
const FIM = "";

/** Toda marca de controle, para a limpeza de sobra. */
const MARCAS = new RegExp(`[${INICIO}${FIM}]`, "g");

/**
 * A frente do card com a lacuna cercada para o render achar.
 *
 * `conteudo` é o que ocupa o lugar da lacuna: a própria marca `[…]` no estado
 * pergunta, a resposta no estado resposta — e aí o Markdown e o LaTeX dela
 * são lidos junto com o resto da frase, que é o que faz a revelação ser
 * in-loco e não um bloco à parte.
 *
 * Sem lacuna (todo card de pergunta/resposta) o texto volta intacto.
 */
export function marcarLacuna(prompt: string, conteudo: string = LACUNA): string {
  const posicao = prompt.indexOf(LACUNA);

  if (posicao === -1) return prompt;

  return (
    prompt.slice(0, posicao) +
    INICIO +
    conteudo +
    FIM +
    prompt.slice(posicao + LACUNA.length)
  );
}

export type Estado = "oculta" | "revelada";

type No = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: No[];
};

export type Raiz = { type: "root"; children: No[] };

type Achado = { indice: number; posicao: number; valor: string };

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

/**
 * Os filhos com o trecho entre as marcas dentro de um `span`, ou `null` se as
 * duas marcas não estão neste nível.
 *
 * O trecho pode atravessar irmãos — a resposta `$\vec a$` vira um elemento do
 * KaTeX entre dois nós de texto —, por isso o corte é por índice e posição, e
 * não um `replace` em um nó só.
 */
function envolver(filhos: No[], estado: Estado): No[] | null {
  const abre = acharMarca(filhos, INICIO);
  const fecha = acharMarca(filhos, FIM);

  if (abre === null || fecha === null) return null;

  const dentro =
    abre.indice === fecha.indice
      ? texto(abre.valor.slice(abre.posicao + INICIO.length, fecha.posicao))
      : [
          ...texto(abre.valor.slice(abre.posicao + INICIO.length)),
          ...filhos.slice(abre.indice + 1, fecha.indice),
          ...texto(fecha.valor.slice(0, fecha.posicao)),
        ];

  return [
    ...filhos.slice(0, abre.indice),
    ...texto(abre.valor.slice(0, abre.posicao)),
    {
      type: "element",
      tagName: "span",
      properties: { className: [`cloze-${estado}`] },
      children: dentro,
    },
    ...texto(fecha.valor.slice(fecha.posicao + FIM.length)),
    ...filhos.slice(fecha.indice + 1),
  ];
}

function percorrer(no: No, estado: Estado): boolean {
  const filhos = no.children;

  if (filhos === undefined) return false;

  const novos = envolver(filhos, estado);

  if (novos !== null) {
    no.children = novos;
    return true;
  }

  // `some` para parar no primeiro: a frente do card tem uma lacuna só.
  return filhos.some((filho) => percorrer(filho, estado));
}

/**
 * Sobra de marca nunca deveria existir — as duas são escritas juntas —, mas
 * se o Markdown separar o par em dois nós que não são irmãos, o usuário veria
 * um caractere fantasma no meio da frase. Melhor o filete faltar.
 */
function limpar(no: No): void {
  if (no.value !== undefined) no.value = no.value.replace(MARCAS, "");

  no.children?.forEach(limpar);
}

/** Plugin de rehype: o trecho marcado por `marcarLacuna` vira um `span`. */
export function envolverLacuna(estado: Estado) {
  return () =>
    (tree: Raiz): void => {
      percorrer(tree, estado);
      limpar(tree);
    };
}
