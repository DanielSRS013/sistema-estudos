import { beforeEach } from "vitest";

import { limparRevalidacoes } from "./next-cache";

// Trava: sem ela, uma DATABASE_URL de produção no ambiente faria a suíte
// escrever nas notas reais. Só o script `pnpm test:db` põe estas variáveis,
// apontando para um branch efêmero do Neon.
if (!/^teste-/.test(process.env.ESTUDOS_TEST_BRANCH ?? "")) {
  throw new Error(
    "Suíte de banco recusada: ESTUDOS_TEST_BRANCH não aponta para um branch de teste. Use `pnpm test:db`.",
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Suíte de banco recusada: DATABASE_URL está vazia. Use `pnpm test:db`.",
  );
}

beforeEach(() => {
  limparRevalidacoes();
});
