import { redirect } from "next/navigation";
import { Suspense } from "react";

import { entrarComGitHub } from "@/features/auth/actions";
import { auth } from "@/features/auth/auth";
import { Carregando } from "@/shared/shell";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/cn";

/**
 * Modo foco, como `/review`: sem rail e sem margem. A única coisa a fazer
 * nesta tela é entrar.
 *
 * Sessão e `searchParams` são lidos dentro do Suspense: `cacheComponents`
 * está ligado e, fora dessa fronteira, o Next recusa o prerender da rota.
 */

const MOTIVOS: Record<string, string> = {
  // O callback `signIn` recusou: conta fora da allowlist.
  AccessDenied:
    "Essa conta do GitHub não está na lista de acesso. Entre com a conta autorizada.",
  // Falta `AUTH_SECRET` ou as credenciais do provider no ambiente.
  Configuration:
    "O login não está configurado no servidor. Confira as variáveis de ambiente do Auth.js.",
};

const MOTIVO_PADRAO =
  "O login não completou. Tente de novo; se repetir, confira a conexão com o GitHub.";

async function Porta({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, sessao] = await Promise.all([searchParams, auth()]);

  if (sessao?.user != null) redirect("/");

  return (
    <>
      {error === undefined ? null : (
        <p
          role="alert"
          className="rounded-sm border border-rule bg-muted/40 px-3 py-2 text-sm text-ink"
        >
          {MOTIVOS[error] ?? MOTIVO_PADRAO}
        </p>
      )}

      <form action={entrarComGitHub}>
        <button type="submit" className={cn(buttonVariants({ size: "lg" }))}>
          Entrar com o GitHub
        </button>
      </form>
    </>
  );
}

export default function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-1">
          <p className="font-mono text-xs tracking-wide text-ink-soft">
            estudos
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Entrar para continuar
          </h1>
          <p className="font-serif text-base leading-[1.65] text-ink-soft">
            As notas, os cards e o histórico de revisão ficam atrás do login.
          </p>
        </header>

        <Suspense fallback={<Carregando>Abrindo a porta.</Carregando>}>
          <Porta searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
