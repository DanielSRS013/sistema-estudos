// O que as três telas de cursos escrevem ao lado de cada nome: a meta do
// curso, a contagem do módulo, as notas da aula e o tamanho da
// especialização. Módulo puro — entram números, sai o texto do handoff.
//
// Mora aqui, e não na tela, porque a mesma frase aparece duas vezes: a meta
// "5 módulos · 18 aulas · 14 estudadas" é a linha de `/courses` e também o
// subtítulo do cabeçalho em `/courses/[courseSlug]`. Duas cópias divergiriam
// no primeiro ajuste de plural.

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/**
 * "5 módulos · 18 aulas · 14 estudadas".
 *
 * Os extremos têm palavra em vez de número, como o handoff escreve: zero é
 * "nenhuma estudada" e o total é "todas estudadas" — quem lê quer saber se
 * falta algo, não fazer a subtração. Curso sem aula nenhuma para na segunda
 * parte: "0 aulas · nenhuma estudada" diz duas vezes a mesma coisa.
 */
export function courseMetaLabel({
  moduleCount,
  lessonCount,
  studiedCount,
}: {
  moduleCount: number;
  lessonCount: number;
  studiedCount: number;
}): string {
  const inicio = `${plural(moduleCount, "módulo", "módulos")} · ${plural(
    lessonCount,
    "aula",
    "aulas",
  )}`;

  if (lessonCount === 0) return inicio;

  const estudadas =
    studiedCount === 0
      ? "nenhuma estudada"
      : studiedCount === lessonCount
        ? "todas estudadas"
        : `${studiedCount} estudadas`;

  return `${inicio} · ${estudadas}`;
}

/** "2 de 5 estudadas" — o resumo que o módulo recolhido mostra. */
export function moduleStudiedLabel({
  lessonCount,
  studiedCount,
}: {
  lessonCount: number;
  studiedCount: number;
}): string {
  if (lessonCount === 0) return "sem aulas";

  return `${studiedCount} de ${lessonCount} estudadas`;
}

/** "3 notas" na linha da aula; sem nenhuma, a ausência se diz por extenso. */
export function lessonNotesLabel(count: number): string {
  if (count === 0) return "sem notas";

  return plural(count, "nota", "notas");
}

/**
 * "Especialização · 3 cursos" à direita do nome da especialização. O grupo dos
 * cursos soltos não tem o que prefixar — só conta.
 */
export function trackCountLabel(track: string | null, count: number): string {
  const cursos = plural(count, "curso", "cursos");

  return track === null ? cursos : `Especialização · ${cursos}`;
}
