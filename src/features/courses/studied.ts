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
