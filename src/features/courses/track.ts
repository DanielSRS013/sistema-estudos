// Agrupamento de cursos por especialização — SPEC §2: a hierarquia do Coursera
// é especialização → curso, e `courses.track` é a única coisa no schema que
// guarda o primeiro nível. Puro: entra a lista como o banco a ordenou, saem as
// seções na mesma ordem.

export type TrackGroup<T> = {
  /** `null` é a seção dos cursos sem especialização. */
  track: string | null;
  courses: T[];
};

/**
 * Agrupa preservando a ordem: as seções aparecem na ordem do primeiro curso de
 * cada uma, e dentro da seção os cursos ficam como vieram — a lista chega
 * ordenada por `position`, que é o arranjo que o usuário montou.
 *
 * Os cursos sem especialização vão para o fim. São o resto, não o começo.
 */
export function groupByTrack<T extends { track: string | null }>(
  rows: readonly T[],
): TrackGroup<T>[] {
  const porTrack = new Map<string, T[]>();
  const soltos: T[] = [];

  for (const row of rows) {
    if (row.track === null) {
      soltos.push(row);
      continue;
    }

    const grupo = porTrack.get(row.track);

    if (grupo === undefined) porTrack.set(row.track, [row]);
    else grupo.push(row);
  }

  const grupos: TrackGroup<T>[] = [...porTrack].map(([track, courses]) => ({
    track,
    courses,
  }));

  if (soltos.length > 0) grupos.push({ track: null, courses: soltos });

  return grupos;
}
