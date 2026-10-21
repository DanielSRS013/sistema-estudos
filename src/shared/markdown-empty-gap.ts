// A lacuna vazia como elemento na pré-visualização do editor.
//
// O handoff mostra o trecho com lacuna vazia marcado dentro do texto: Mono a
// 15px, filete de 2px `--ink`, lendo "{{}} lacuna vazia". É o par visual do
// alerta que aparece acima do editor — o bloco diz qual é o problema, a marca
// diz onde ele está na frase.
//
// O caminho é o mesmo de `markdown-cloze.ts`, e pelos mesmos dois motivos: o
// render não tem `rehype-raw`, então HTML no Markdown sairia escapado, e um
// `replace` na string não alcança o que o Markdown já transformou em árvore.
// Aqui, porém, basta **uma** marca, não um par: o que entra no `span` é sempre
// o mesmo rótulo fixo, nunca um trecho da nota. Quem decide onde a marca entra
// é `cards/empty-gaps.ts`, que pergunta ao parser.
//
// Os tipos do hast são estruturais de propósito, como nos módulos vizinhos:
// `@types/hast` é dependência fora do SPEC.

import type { No, Raiz } from "./markdown-cloze";

/* Área de uso privado do Unicode, o degrau seguinte ao par do cloze
   (``/``): não aparece em nota nenhuma e sobrevive ao Markdown
   como texto comum em vez de virar sintaxe. */
export const MARCA_VAZIA = "";

/** O que a marca mostra na tela. O `{{}}` faz parte do rótulo. */
const ROTULO = "{{}} lacuna vazia";

function span(): No {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["lacuna-vazia"] },
    children: [{ type: "text", value: ROTULO }],
  };
}

/** Nó de texto só quando há texto: `""` viraria nó vazio na árvore. */
function texto(valor: string): No[] {
  return valor === "" ? [] : [{ type: "text", value: valor }];
}

/**
 * Os filhos com cada marca trocada pelo `span` do rótulo.
 *
 * A marca nunca atravessa irmãos — é um caractere só, escrito dentro de um
 * trecho de texto comum —, então o corte é por nó, e um nó pode ter mais de
 * uma marca.
 */
function trocar(filhos: No[]): No[] {
  const novos: No[] = [];
  let achou = false;

  for (const filho of filhos) {
    const valor = filho.value;

    if (filho.type !== "text" || valor === undefined) {
      novos.push(filho);
      continue;
    }

    const partes = valor.split(MARCA_VAZIA);

    if (partes.length === 1) {
      novos.push(filho);
      continue;
    }

    achou = true;

    partes.forEach((parte, indice) => {
      if (indice > 0) novos.push(span());
      novos.push(...texto(parte));
    });
  }

  return achou ? novos : filhos;
}

function percorrer(no: No): void {
  const filhos = no.children;

  if (filhos === undefined) return;

  no.children = trocar(filhos);
  // Todas as marcas da nota, não só a primeira: o editor mostra a nota
  // inteira, e nada impede duas lacunas vazias ao mesmo tempo.
  no.children.forEach(percorrer);
}

/** Plugin de rehype: cada `MARCA_VAZIA` vira o `span` do rótulo. */
export function envolverLacunasVazias() {
  return () =>
    (tree: Raiz): void => {
      percorrer(tree);
    };
}
