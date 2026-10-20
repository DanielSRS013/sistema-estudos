"use server";

import { signIn, signOut } from "./auth";

/**
 * Entrar e sair não recebem entrada do usuário — não há o que validar com
 * Zod aqui, e por isso também não há mensagem de erro para devolver: o
 * Auth.js devolve o caso de recusa em `/entrar?error=`.
 */
export async function entrarComGitHub(): Promise<void> {
  await signIn("github", { redirectTo: "/" });
}

export async function sair(): Promise<void> {
  await signOut({ redirectTo: "/entrar" });
}
