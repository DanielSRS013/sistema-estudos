import { SignOut } from "@/features/auth/components/sign-out";
import {
  agoraDoRequest,
  fetchLimits,
  fetchQueue,
} from "@/features/review/queries";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";

import { fetchRail } from "../queries";

import { Rail } from "./rail";

/**
 * Árvore de cursos para a `Shell`. Lê o banco; vive sob o Suspense dela.
 *
 * A contagem ao lado de "Revisão" é a mesma fila que o painel mostra — os
 * cards que ainda cabem hoje depois dos limites —, pelas funções que já
 * existem, sem consulta nova.
 */
export async function CourseRail() {
  const agora = await agoraDoRequest();
  const limits = await fetchLimits();
  const [courses, fila] = await Promise.all([
    fetchRail(),
    fetchQueue(agora, limits),
  ]);

  return (
    <Rail
      courses={courses}
      contagemRevisao={fila.cards.length}
      rodape={
        <>
          <ThemeToggle />
          <SignOut />
        </>
      }
    />
  );
}
