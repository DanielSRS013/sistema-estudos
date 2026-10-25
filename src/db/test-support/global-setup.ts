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

  const { db } = await import("../index");
  const { cards, notes, reviews } = await import("../schema");

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
}
