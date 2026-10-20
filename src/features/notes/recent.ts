// Rótulo de "última edição" das notas do painel. Puro: entra a hora gravada no
// servidor, sai o texto que a lista mostra.
//
// A lista é ordenada por recência, então o que importa na maioria das linhas é
// a hora de hoje; data cheia só quando a nota já saiu do alcance da memória.

/** Fuso do usuário. O corte de dia lógico de SPEC §4 mora no scheduler. */
const FUSO = "America/Sao_Paulo";

const diaCivil = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
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

const MS_POR_DIA = 86_400_000;

/** O dia anterior a um `YYYY-MM-DD`, pela aritmética em UTC — sem fuso no meio. */
function diaAnterior(dia: string): string {
  return new Date(Date.parse(`${dia}T12:00:00Z`) - MS_POR_DIA)
    .toISOString()
    .slice(0, 10);
}

/**
 * Como a última edição se lê na tela: `hoje 18:42`, `ontem 23:47`, `14/10` ou
 * `31/12/2025`. O dia é o civil no fuso do usuário, não o do servidor.
 */
export function lastEditLabel(at: Date, now: Date): string {
  const dia = diaCivil.format(at);
  const hoje = diaCivil.format(now);

  if (dia === hoje) return `hoje ${hora.format(at)}`;
  if (dia === diaAnterior(hoje)) return `ontem ${hora.format(at)}`;

  const mesmoAno = dia.slice(0, 4) === hoje.slice(0, 4);

  return mesmoAno ? dataCurta.format(at) : dataComAno.format(at);
}
