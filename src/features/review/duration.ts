// Quanto tempo um card custa, escrito para a tela. Puro: entra a mediana em
// milissegundos lida de `reviews.duration_ms`, sai o rótulo do painel.
//
// A mediana, e não a média: uma revisão interrompida no meio (o café, a aula
// que começa) grava minutos de nada e puxaria a média sozinha.

const umaCasa = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const MS_POR_SEGUNDO = 1_000;
const SEGUNDOS_POR_MINUTO = 60;

/**
 * `null` quando não há histórico com duração — é o estado de quem ainda não
 * revisou nada, e de toda revisão gravada antes de a coluna existir.
 */
export function durationLabel(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";

  const segundos = ms / MS_POR_SEGUNDO;

  if (segundos < SEGUNDOS_POR_MINUTO) return `${umaCasa.format(segundos)} s`;

  // Arredonda o total antes de partir em minutos e segundos: partir primeiro
  // deixaria 119,6 s virar "1 min 60 s".
  const inteiros = Math.round(segundos);
  const minutos = Math.floor(inteiros / SEGUNDOS_POR_MINUTO);
  const resto = inteiros % SEGUNDOS_POR_MINUTO;

  return resto === 0 ? `${minutos} min` : `${minutos} min ${resto} s`;
}
