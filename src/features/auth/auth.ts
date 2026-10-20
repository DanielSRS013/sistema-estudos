// Auth.js com provider único (GitHub), sessão em JWT e nenhum adapter: o app
// é de um usuário só e o schema não tem tabela de usuário, então não há
// sessão para gravar — e, portanto, nenhuma migration nesta fatia.
//
// Este módulo roda também no middleware, que é edge: nada de banco aqui.

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

import { isPermitido, parseAllowlist } from "./allowlist";

/** Rotas abertas. O resto exige sessão. */
export const ROTA_ENTRAR = "/entrar";

/**
 * O handle do GitHub vem no profile bruto, fora do tipo `Profile`. Lido por
 * estreitamento, sem casting: chave ausente ou de outro tipo vira `null`.
 */
function lerLogin(profile: unknown): string | null {
  if (typeof profile !== "object" || profile === null) return null;
  if (!("login" in profile)) return null;

  const valor: unknown = profile.login;

  return typeof valor === "string" ? valor : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: { signIn: ROTA_ENTRAR, error: ROTA_ENTRAR },
  callbacks: {
    /**
     * A trava: o provider é o GitHub inteiro, e só quem está em
     * `AUTH_ALLOWED` entra. Variável ausente recusa todo mundo.
     */
    signIn({ user, profile }) {
      return isPermitido(
        { email: user.email ?? profile?.email, login: lerLogin(profile) },
        parseAllowlist(process.env.AUTH_ALLOWED),
      );
    },
    /** Consultado pelo middleware: sem sessão, redireciona para `/entrar`. */
    authorized({ auth: sessao }) {
      return sessao?.user != null;
    },
  },
});
