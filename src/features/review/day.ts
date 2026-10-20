// Dia lógico — SPEC §4. Todo "hoje" do app sai daqui.
//
// O dia do usuário não vira à meia-noite: ele estuda até depois da uma e isso
// ainda é o dia de ontem. O corte é às 04:00 em `America/Sao_Paulo`. Módulo
// puro: só funções de Date para string, sem I/O e sem React.

/** Fuso do usuário. Exportado porque o SQL do painel agrupa por dia lógico. */
export const FUSO = "America/Sao_Paulo";

/** Hora do corte, em horas de parede no fuso do usuário. */
export const CORTE_HORAS = 4;

const MS_POR_HORA = 3_600_000;
const MS_POR_DIA = 24 * MS_POR_HORA;

/** Dia civil no fuso do usuário, em `YYYY-MM-DD`. */
const dia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Partes da hora de parede no fuso, para descobrir o deslocamento do dia. */
const parede = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * Quanto o fuso está à frente do UTC neste instante, em milissegundos.
 * Calculado pelo `Intl` em vez de fixar −03:00: São Paulo não tem horário de
 * verão hoje, mas já tive e pode voltar a ter, e o corte de dia não é lugar
 * para essa aposta.
 */
function deslocamento(instante: Date): number {
  const campos = new Map(
    parede.formatToParts(instante).map((parte) => [parte.type, parte.value]),
  );

  const numero = (tipo: Intl.DateTimeFormatPartTypes): number =>
    Number(campos.get(tipo) ?? "0");

  const comoUtc = Date.UTC(
    numero("year"),
    numero("month") - 1,
    numero("day"),
    // 24 aparece no lugar de 0 em algumas versões do ICU.
    numero("hour") % 24,
    numero("minute"),
    numero("second"),
  );

  return comoUtc - instante.getTime();
}

/**
 * O dia lógico de um instante, em `YYYY-MM-DD`. Antes das 04:00 ainda é o dia
 * anterior — por isso o recuo de quatro horas antes de formatar.
 */
export function logicalDay(now: Date): string {
  return dia.format(new Date(now.getTime() - CORTE_HORAS * MS_POR_HORA));
}

/**
 * O instante em que o dia lógico de `now` começou: 04:00 no fuso do usuário.
 * É o `>=` das contagens do painel ("quantos revisei hoje").
 */
export function dayStart(now: Date): Date {
  const [ano, mes, dia_] = logicalDay(now).split("-").map(Number);

  const parede_ = Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia_ ?? 1, CORTE_HORAS);

  // Duas passadas: a primeira estima o deslocamento, a segunda o confirma com
  // o instante já corrigido — o que importa quando o corte cai perto de uma
  // virada de horário de verão.
  const estimado = new Date(parede_ - deslocamento(new Date(parede_)));

  return new Date(parede_ - deslocamento(estimado));
}

/**
 * O instante em que o dia lógico de `now` termina: o corte seguinte. É o fim
 * da janela da fila — um card que vence às 23h de hoje já entra na fila de
 * agora, porque é o mesmo dia de estudo.
 */
export function dayEnd(now: Date): Date {
  return dayStart(new Date(dayStart(now).getTime() + MS_POR_DIA + MS_POR_HORA));
}

/** Diferença em dias entre dois dias lógicos (`YYYY-MM-DD`). */
function distancia(de: string, para: string): number {
  return Math.round((Date.parse(para) - Date.parse(de)) / MS_POR_DIA);
}

/**
 * Em quantos dias lógicos o card vence, contado de `now`. Zero para o que já
 * venceu ou vence hoje — é o "Próxima revisão em X dias" da tela vazia.
 */
export function daysUntil(due: Date, now: Date): number {
  return Math.max(0, distancia(logicalDay(now), logicalDay(due)));
}

/**
 * Dias de estudo consecutivos terminando hoje. Se hoje ainda não teve revisão
 * a sequência continua valendo pelo dia anterior: o dia não acabou, e zerar a
 * contagem às 04:00 puniria quem ainda vai estudar à noite.
 *
 * `days` são dias lógicos (`YYYY-MM-DD`), em qualquer ordem e com repetição.
 */
export function streak(days: readonly string[], today: string): number {
  const vistos = new Set(days);

  // Onde a contagem começa: hoje, se já estudou; senão ontem.
  let cursor = vistos.has(today)
    ? today
    : new Date(Date.parse(today) - MS_POR_DIA).toISOString().slice(0, 10);

  let total = 0;

  while (vistos.has(cursor)) {
    total += 1;
    cursor = new Date(Date.parse(cursor) - MS_POR_DIA)
      .toISOString()
      .slice(0, 10);
  }

  return total;
}
