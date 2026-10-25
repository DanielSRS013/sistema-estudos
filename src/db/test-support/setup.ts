import { beforeEach } from "vitest";

import { limparRevalidacoes } from "./next-cache";

// Roda por arquivo e não toca no banco. A conferência do banco em si (contagem
// de linhas) está em global-setup.ts, uma vez por rodada.
// Camada declaratória: barra o ambiente herdado sem a variável de branch. Só o
// script `pnpm test:db` põe estas variáveis, apontando para um branch efêmero.
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
