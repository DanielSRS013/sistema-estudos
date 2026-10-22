// A data em que a aula foi estudada, escrita para o cabeçalho. Puro: entra o
// instante gravado em `lessons.studied_on`, sai a data civil no fuso do
// usuário — o servidor pode estar em qualquer lugar.
//
// Data civil, sem o corte das 04:00 de SPEC §4: aquele corte existe para a
// contagem da fila, e marcar uma aula não é revisar.

const data = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function studiedLabel(at: Date): string {
  return data.format(at);
}

/** Quantas das aulas já foram estudadas — a conta que as duas telas pedem. */
export function studiedCount(
  lessons: readonly { studiedOn: Date | null }[],
): number {
  return lessons.filter((lesson) => lesson.studiedOn !== null).length;
}

/**
 * O estado da aula ao lado do botão: "Estudada hoje", "Estudada em
 * 20/10/2026" ou "Ainda não estudada".
 *
 * Hoje vira advérbio: a data do dia corrente não diz nada a quem acabou de
 * marcar a aula, e é exatamente aí que o rótulo é lido.
 */
export function studiedStatusLabel(at: Date | null, now: Date): string {
  if (at === null) return "Ainda não estudada";

  const quando = studiedLabel(at);

  return quando === studiedLabel(now) ? "Estudada hoje" : `Estudada em ${quando}`;
}
