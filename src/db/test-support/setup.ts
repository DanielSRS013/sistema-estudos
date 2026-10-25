import { beforeEach } from "vitest";

import { limparRevalidacoes } from "./next-cache";

// Duas camadas de trava. Sem elas, uma DATABASE_URL de produção faria a suíte
// escrever nas notas reais. Só o script `pnpm test:db` põe estas variáveis,
// apontando para um branch efêmero do Neon.

// Camada 1: declaratória. Barra o ambiente herdado sem a variável de branch.
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

// Camada 2: verifica o banco de fato. Um branch --schema-only é sempre vazio;
// se há dado, a URL não é de um branch de teste, mesmo com as variáveis
// forjadas. Só leitura (select). Import dinâmico: o `@/db` lança sem URL, e a
// camada 1 já garantiu que ela existe.
const { db } = await import("@/db");
const { cards, notes, reviews } = await import("@/db/schema");

const [n, c, r] = await Promise.all([
  db.select().from(notes),
  db.select().from(cards),
  db.select().from(reviews),
]);

if (n.length > 0 || c.length > 0 || r.length > 0) {
  throw new Error(
    `Suíte de banco recusada: o banco apontado por DATABASE_URL já tem dados (${n.length} notas, ${c.length} cards, ${r.length} revisões). Um branch de teste nasce vazio; esta URL provavelmente é a da main. Use \`pnpm test:db\`.`,
  );
}

beforeEach(() => {
  limparRevalidacoes();
});
