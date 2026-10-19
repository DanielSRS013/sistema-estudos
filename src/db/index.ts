import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL não está definida. Copie .env.example para .env.local e preencha com a connection string do Neon.",
  );
}

export const db = drizzle(neon(url), { schema });
