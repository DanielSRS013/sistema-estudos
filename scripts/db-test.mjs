// Roda o projeto `db` do Vitest contra um branch efêmero do Neon.
// Node puro; a única biblioteca é o driver do Neon, que o app já usa.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

// O fileParallelism não é opção por projeto no Vitest (só da raiz); por isso a
// seriação dos arquivos de banco vai como flag na linha de comando, abaixo.
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const neonctl = process.env.NEONCTL ?? "neonctl";
const ids = [
  "--project-id",
  "jolly-paper-96338438",
  "--org-id",
  "org-dark-glade-96360087",
];

// Comando montado numa string só (shell: true) porque no Windows o neonctl é
// um shim .cmd; os argumentos são todos fixos ou gerados aqui, sem entrada externa.
function neonctlSync(args) {
  const r = spawnSync([neonctl, ...args, ...ids].join(" "), {
    encoding: "utf8",
    shell: true,
    cwd: raiz,
  });
  if (r.status !== 0) {
    throw new Error(
      `neonctl ${args[0]} ${args[1] ?? ""} falhou (código ${r.status}): ${r.stderr}`.trim(),
    );
  }
  return r.stdout.trim();
}

// O drizzle-kit grava em drizzle.__drizzle_migrations o sha256 do arquivo .sql
// de cada migration. Comparar os hashes é exato: não depende de contagem.
async function conferirSchema() {
  const url = neonctlSync(["connection-string", "main"]);
  const sql = neon(url);
  const aplicadas = new Set(
    (await sql.query("select hash from drizzle.__drizzle_migrations")).map(
      (l) => l.hash,
    ),
  );
  const pasta = join(raiz, "drizzle");
  const faltando = readdirSync(pasta)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter(
      (f) =>
        !aplicadas.has(
          createHash("sha256")
            .update(readFileSync(join(pasta, f), "utf8").replace(/\r\n/g, "\n"))
            .digest("hex"),
        ),
    );
  if (faltando.length > 0) {
    console.error(
      `Há migration gerada e não aplicada na main — aplique antes de testar. (${faltando.join(", ")})`,
    );
    process.exit(1);
  }
}

// Aviso, não varredura: apagar branch é destrutivo e, com duas rodadas
// simultâneas, um varredor derrubaria a do vizinho. Fechar a janela ou
// kill -9 não dispara os handlers, então o branch pode ter ficado vivo (e pago).
function avisarBranchesRemanescentes() {
  const saida = neonctlSync(["branches", "list", "--output", "json"]);
  const lista = JSON.parse(saida);
  const restos = (Array.isArray(lista) ? lista : lista.branches ?? [])
    .map((b) => b.name)
    .filter((n) => typeof n === "string" && n.startsWith("teste-"));
  if (restos.length > 0) {
    console.warn(
      `Aviso: sobraram branches de teste no Neon (cobrados): ${restos.join(", ")}. Se nenhuma outra rodada estiver em andamento, apague com: neonctl branches delete <nome> --project-id ${ids[1]} --org-id ${ids[3]}`,
    );
  }
}

avisarBranchesRemanescentes();
await conferirSchema();

const nome = `teste-${Date.now()}`;
let apagado = false;

function apagarBranch() {
  if (apagado) return;
  apagado = true;
  try {
    neonctlSync(["branches", "delete", nome]);
  } catch (e) {
    console.error(`Não consegui apagar o branch ${nome}; apague à mão.`, e);
  }
}

let filho = null;
for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => {
    filho?.kill();
    apagarBranch();
    process.exit(130);
  });
}

let codigo = 1;
try {
  neonctlSync(["branches", "create", "--name", nome, "--parent", "main", "--schema-only"]);
  const url = neonctlSync(["connection-string", nome]);
  const vitest = join(raiz, "node_modules", "vitest", "vitest.mjs");
  codigo = await new Promise((resolve) => {
    filho = spawn(process.execPath, [vitest, "run", "--project", "db", "--no-file-parallelism", ...process.argv.slice(2)], {
      cwd: raiz,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url, ESTUDOS_TEST_BRANCH: nome },
    });
    filho.on("exit", (c) => resolve(c ?? 1));
  });
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
} finally {
  apagarBranch();
}
process.exit(codigo);
