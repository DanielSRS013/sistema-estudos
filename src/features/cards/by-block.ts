// O card ao lado do seu trecho — a grade da leitura da nota.
//
// O handoff põe **cada bloco da nota como uma linha da grade**, com os cards
// daquele bloco na segunda coluna da mesma linha. Quem sabe onde um bloco
// termina é o render, não o servidor: só depois do Markdown virar árvore é que
// existe a lista de blocos de topo com a linha de origem de cada um.
//
// Daí este plugin: ele percorre os filhos diretos da raiz e insere, depois de
// cada bloco que gerou card, um `aside` com os índices desses cards. Quem
// desenha o `aside` é a tela, por `components.aside` do react-markdown; a
// colocação na linha certa é da própria grade (`.note-grid` em globals.css),
// que acha a coluna 2 livre na linha do bloco que acabou de ser colocado.
//
// A alternativa era o que havia antes: uma `aside` única ao lado do texto e o
// vínculo dito por opacidade, com a lista de blocos medida no navegador por
// `IntersectionObserver`. O handoff resolve por posição, e posição se decide no
// servidor — sem JavaScript, sem hidratação e sem o card certo piscar.
//
// Os tipos do hast são estruturais de propósito, como nos plugins vizinhos de
// `shared`: `@types/hast` é dependência fora do SPEC e aqui só três campos
// interessam.

import { blocoDe } from "./lines";
import { faixasDeBlocos } from "./parser";

type No = {
  type: string;
  tagName?: string;
  position?: { start?: { line?: number } };
  properties?: Record<string, unknown>;
  children?: No[];
};

type Raiz = { type: "root"; children: No[] };

/** O bloco de topo e a linha em que ele começa. */
type Bloco = { no: No; linha: number };

function blocosDeTopo(tree: Raiz): Bloco[] {
  const achados: Bloco[] = [];

  for (const no of tree.children) {
    const linha = no.position?.start?.line;

    if (no.type !== "element" || linha === undefined) continue;

    achados.push({ no, linha });
  }

  return achados;
}

function aside(indices: number[]): No {
  return {
    type: "element",
    tagName: "aside",
    properties: { "data-cards": indices.join(" ") },
    children: [],
  };
}

/**
 * Plugin de rehype: depois de cada unidade do texto que gerou card entra um
 * `aside` com os índices dos cards dela, na ordem da nota.
 *
 * `cards` é a lista da margem, na mesma ordem em que a tela a desenha — o que
 * viaja no atributo é o índice nela, não o id, porque é por índice que o
 * componente do `aside` encontra o card. `content` é o texto da nota, de onde
 * saem as unidades.
 *
 * Card sem linha conhecida (âncora de outra versão do texto) vai para o último
 * bloco: ele continua alcançável em vez de desaparecer da tela.
 */
export function cardsPorBloco(
  cards: readonly { line: number | null }[],
  content: string,
) {
  return () =>
    (tree: Raiz): void => {
      if (cards.length === 0) return;

      const blocos = blocosDeTopo(tree);
      const ultimo = blocos[blocos.length - 1];

      if (ultimo === undefined) return;

      const unidades = faixasDeBlocos(content);
      const inicios = unidades.map((unidade) => unidade.primeira);

      // Âncora da unidade: o último bloco de topo que cai dentro dela. É ele
      // que fecha a linha da grade, então é depois dele que o `aside` entra.
      const ancoras = new Map<number, No>();

      for (const bloco of blocos) {
        const unidade = unidades.find(
          (candidata) =>
            bloco.linha >= candidata.primeira && bloco.linha <= candidata.ultima,
        );

        if (unidade !== undefined) ancoras.set(unidade.primeira, bloco.no);
      }

      // Unidade sem bloco próprio: o `Q::` na segunda linha de um parágrafo
      // parte a unidade em duas faixas, e a árvore tem um `<p>` só. A faixa de
      // baixo está escrita dentro daquele nó, então herda a âncora da unidade
      // anterior. Sem isso ela caía no último bloco da nota, e o card aparecia
      // ao lado de um parágrafo sem relação.
      let herdada: No | undefined;

      for (const unidade of unidades) {
        const propria = ancoras.get(unidade.primeira);

        if (propria !== undefined) herdada = propria;
        else if (herdada !== undefined) ancoras.set(unidade.primeira, herdada);
      }

      const porNo = new Map<No, number[]>();

      cards.forEach((card, indice) => {
        const inicio = card.line === null ? null : blocoDe(card.line, inicios);
        const no =
          (inicio === null ? undefined : ancoras.get(inicio)) ?? ultimo.no;

        porNo.set(no, [...(porNo.get(no) ?? []), indice]);
      });

      const novos: No[] = [];

      for (const no of tree.children) {
        novos.push(no);

        const indices = porNo.get(no);

        if (indices !== undefined) novos.push(aside(indices));
      }

      tree.children = novos;
    };
}
