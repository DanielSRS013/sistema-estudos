// Reordenação por troca com o vizinho. O cálculo de quem troca com quem é
// puro; a escrita das duas posições acontece numa única instrução SQL.

import { sql, type SQL } from "drizzle-orm";

export type Direction = "up" | "down";

export type Positioned = { id: string; position: number };

/**
 * Vizinho com quem `id` deve trocar de lugar, ou `null` quando o item já está
 * na ponta (ou não pertence à lista). A lista é ordenada por `position` aqui
 * mesmo, para não depender da ordem em que chegou.
 */
export function neighborFor<T extends Positioned>(
  items: readonly T[],
  id: string,
  direction: Direction,
): T | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const index = sorted.findIndex((item) => item.id === id);

  if (index === -1) return null;

  const neighbor = sorted[direction === "up" ? index - 1 : index + 1];

  return neighbor ?? null;
}

/**
 * Troca de posição com o vizinho numa única instrução — atômica por si, sem
 * depender de transação (o driver HTTP do Neon não as oferece). `id` sem
 * qualificação porque o UPDATE é sempre de uma tabela só.
 *
 * O `::integer` é obrigatório: dentro do `case` o Postgres não tipa o
 * parâmetro pela coluna de destino, trata como `text` e recusa o UPDATE.
 */
export function swapPositions(
  current: Positioned,
  neighbor: Positioned,
): SQL<number> {
  return sql`case when id = ${current.id} then ${neighbor.position}::integer else ${current.position}::integer end`;
}
