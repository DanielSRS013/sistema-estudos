import { fetchRail } from "../queries";

import { Rail } from "./rail";

/** Árvore de cursos para a `Shell`. Lê o banco; vive sob o Suspense dela. */
export async function CourseRail() {
  const courses = await fetchRail();

  return <Rail courses={courses} />;
}
