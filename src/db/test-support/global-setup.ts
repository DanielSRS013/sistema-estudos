// Roda UMA vez por rodada (globalSetup do projeto `db`), no processo principal.
// Verifica o banco de fato: um branch --schema-only nasce vazio; se há dado, a
// URL não é de um branch de teste, mesmo com as variáveis forjadas. Só leitura
// (select). Não pode rodar por arquivo: depois que o primeiro arquivo semeia,
// o banco deixa de estar vazio. Imports relativos: o alias `@` não vale aqui.
export default async function setup(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Suíte de banco recusada: DATABASE_URL está vazia. Use `pnpm test:db`.",
    );
  }

  const { count } = await import("drizzle-orm");
  const { db } = await import("../index");
  const { cards, notes, reviews } = await import("../schema");

  // count(*): na main, que é o caso que a guarda pega, trazer as linhas
  // puxaria as notas reais pela rede antes de recusar.
  const contar = async (
    tabela: typeof notes | typeof cards | typeof reviews,
  ): Promise<number> => {
    const [linha] = await db.select({ total: count() }).from(tabela);
    return linha?.total ?? 0;
  };
  const [n, c, r] = await Promise.all([
    contar(notes),
    contar(cards),
    contar(reviews),
  ]);

  if (n > 0 || c > 0 || r > 0) {
    throw new Error(
      `Suíte de banco recusada: o banco apontado por DATABASE_URL já tem dados (${n} notas, ${c} cards, ${r} revisões). Um branch de teste nasce vazio; esta URL provavelmente é a da main. Use \`pnpm test:db\`.`,
    );
  }
}
