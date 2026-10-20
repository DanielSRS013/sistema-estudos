// Quem pode entrar. O app é de um usuário só, mas o provider é o GitHub
// inteiro: sem esta lista, qualquer conta do GitHub abriria as notas. Função
// pura, sem I/O — quem lê a variável de ambiente é `auth.ts`.

export type Identidade = {
  email?: string | null;
  /** Handle do GitHub, que vem no profile bruto do provider. */
  login?: string | null;
};

/** Entradas separadas por vírgula: e-mails e/ou logins do GitHub. */
export function parseAllowlist(bruto: string | undefined): string[] {
  if (bruto === undefined) return [];

  return bruto
    .split(",")
    .map((entrada) => entrada.trim().toLowerCase())
    .filter((entrada) => entrada !== "");
}

/**
 * Entrada com arroba é e-mail, sem arroba é login do GitHub. A distinção
 * importa: um login homônimo de um e-mail listado não pode passar.
 *
 * Lista vazia recusa todo mundo. Variável de ambiente esquecida no deploy
 * deixa o app trancado, nunca aberto.
 */
export function isPermitido(
  identidade: Identidade,
  permitidos: string[],
): boolean {
  const email = identidade.email?.trim().toLowerCase();
  const login = identidade.login?.trim().toLowerCase();

  return permitidos.some((entrada) =>
    entrada.includes("@")
      ? email !== undefined && email !== "" && entrada === email
      : login !== undefined && login !== "" && entrada === login,
  );
}
