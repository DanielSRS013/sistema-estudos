import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit roda fora do Next, então o .env.local não vem carregado.
// process.loadEnvFile é nativo do Node — evita dependência só para isso.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// Vazio é tolerado para que `db:generate` funcione sem banco algum.
// `db:migrate` e `db:studio` falham aqui, e é isso que queremos: nada
// é aplicado por acidente contra um banco não escolhido.
const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
