// Recorte do destaque da busca. Função pura: string entra, segmentos saem.
//
// O `ts_headline` do Postgres devolve o trecho já marcado, e o jeito óbvio de
// mostrar isso seria injetar HTML. Não aqui: o corpo da nota é conteúdo, e
// conteúdo não vira markup por conta própria. Em vez de `<b>`, pedimos ao
// Postgres dois caracteres de controle como marca, e a UI monta os `<mark>`
// como elementos React — sem `dangerouslySetInnerHTML` em nenhum ponto.

/** Abre o destaque. Caractere de controle: não ocorre em texto digitado. */
export const ABRE = "\u0001";
/** Fecha o destaque. */
export const FECHA = "\u0002";

export type Segmento = {
  texto: string;
  destaque: boolean;
};

/** Tira as marcas que sobraram de um trecho sem par. */
function limpar(texto: string): string {
  return texto.split(ABRE).join("").split(FECHA).join("");
}

export function splitHighlight(trecho: string): Segmento[] {
  const segmentos: Segmento[] = [];

  const guardar = (texto: string, destaque: boolean) => {
    const limpo = destaque ? texto : limpar(texto);
    if (limpo !== "") segmentos.push({ texto: limpo, destaque });
  };

  let cursor = 0;

  while (cursor < trecho.length) {
    const abre = trecho.indexOf(ABRE, cursor);

    if (abre === -1) break;

    const fecha = trecho.indexOf(FECHA, abre + ABRE.length);

    // Marca de abertura sem fechamento: o resto é texto comum.
    if (fecha === -1) break;

    guardar(trecho.slice(cursor, abre), false);
    guardar(trecho.slice(abre + ABRE.length, fecha), true);

    cursor = fecha + FECHA.length;
  }

  guardar(trecho.slice(cursor), false);

  return segmentos;
}
