// Rótulo de "última edição" das notas do painel. Puro: entra a hora gravada no
// servidor, sai o texto que a lista mostra.
//
// O handoff escreve esse tempo em relativo — "há 2 h", "ontem", "sáb." —, e só
// cai na data cheia quando a nota saiu do alcance da semana. A lista é ordenada
// por recência, então a maioria das linhas fica nas primeiras horas.

/** Fuso do usuário. O corte de dia lógico de SPEC §4 mora no scheduler. */
const FUSO = "America/Sao_Paulo";

const diaCivil = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const diaDaSemana = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "short",
});

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
});

const dataComAno = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 60 * MS_POR_MINUTO;
const MS_POR_DIA = 24 * MS_POR_HORA;

/** Quantos dias civis separam dois `YYYY-MM-DD`, pela aritmética em UTC. */
function distancia(de: string, para: string): number {
  return Math.round((Date.parse(para) - Date.parse(de)) / MS_POR_DIA);
}

/**
 * Como a última edição se lê na tela: `agora`, `há 5 min`, `há 2 h`, `ontem`,
 * `sáb.`, `14/10` ou `31/12/2025`.
 *
 * Minuto e hora vêm do intervalo real; o resto vem do dia civil no fuso do
 * usuário, não do servidor. A ordem importa nas bordas: 23:55 lido às 00:05 é
 * "há 10 min", e não "ontem", porque o intervalo é o que a pessoa sente.
 */
export function lastEditLabel(at: Date, now: Date): string {
  const intervalo = now.getTime() - at.getTime();

  // Relógio do servidor atrás do que gravou a nota: ainda é agora, não futuro.
  if (intervalo < MS_POR_MINUTO) return "agora";

  if (intervalo < MS_POR_HORA) {
    return `há ${Math.floor(intervalo / MS_POR_MINUTO)} min`;
  }

  const dia = diaCivil.format(at);
  const hoje = diaCivil.format(now);

  if (dia === hoje) return `há ${Math.floor(intervalo / MS_POR_HORA)} h`;

  const dias = distancia(dia, hoje);

  if (dias === 1) return "ontem";
  if (dias < 7) return diaDaSemana.format(at);

  const mesmoAno = dia.slice(0, 4) === hoje.slice(0, 4);

  return mesmoAno ? dataCurta.format(at) : dataComAno.format(at);
}
