import { SignOut } from "@/features/auth/components/sign-out";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";

import { fetchRail } from "../queries";

import { Rail } from "./rail";

/** Árvore de cursos para a `Shell`. Lê o banco; vive sob o Suspense dela. */
export async function CourseRail() {
  const courses = await fetchRail();

  return (
    <Rail
      courses={courses}
      rodape={
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <ThemeToggle />
          <SignOut />
        </div>
      }
    />
  );
}
