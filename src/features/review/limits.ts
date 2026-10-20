// Os limites diários do SPEC §4, resolvidos a partir da linha de `settings`.
//
// Módulo puro: recebe o que a consulta leu e devolve `Limits`. Existe para que
// `scheduler.ts` continue sem saber que há banco, e para que o caminho "ainda
// não configurado" tenha teste — é o estado de todo banco recém-migrado.

import { DEFAULT_LIMITS, type Limits } from "./scheduler";

/** O recorte de `settings` que os limites usam. */
export type LimitsRow = {
  newPerDay: number;
  reviewsPerDay: number;
};

/**
 * Sem linha gravada, valem os padrões do SPEC §4. Com linha, vale o que está
 * nela — inclusive zero, que é como se pausa a entrada de cards novos.
 */
export function resolveLimits(row: LimitsRow | undefined): Limits {
  if (row === undefined) return DEFAULT_LIMITS;

  return { newPerDay: row.newPerDay, reviewsPerDay: row.reviewsPerDay };
}
