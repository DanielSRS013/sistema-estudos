// A data do cabeçalho do painel. Puro: entra o instante da requisição, sai
// "Terça-feira, 20 de outubro".
//
// A data é a do **dia lógico** de SPEC §4, não a do relógio: às 02:00 o painel
// ainda conta a fila de ontem, e o cabeçalho tem que dizer o mesmo dia — senão
// a data desmente os números logo abaixo dela.

import { logicalDay } from "./day";

// O dia lógico já vem como `YYYY-MM-DD` no fuso do usuário; formatar em UTC
// evita converter fuso duas vezes e trocar o dia na segunda passada.
const data = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function panelDateLabel(now: Date): string {
  const escrito = data.format(new Date(`${logicalDay(now)}T12:00:00Z`));

  // "terça-feira, 20 de outubro" é frase: o pt-BR não capitaliza o dia da
  // semana, e o cabeçalho a mostra sozinha.
  return escrito.charAt(0).toUpperCase() + escrito.slice(1);
}
