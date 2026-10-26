import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// O mesmo alias do tsconfig: os módulos puros importam o schema por "@/db".
const src = fileURLToPath(new URL("./src", import.meta.url));
const stub = (arquivo: string) =>
  fileURLToPath(new URL(`./src/db/test-support/${arquivo}`, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "puro",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.db-test.ts", "**/node_modules/**"],
        },
      },
      {
        resolve: {
          alias: {
            "next/cache": stub("next-cache.ts"),
            "next/navigation": stub("next-navigation.ts"),
            "next/server": stub("next-server.ts"),
            "@": src,
          },
        },
        test: {
          name: "db",
          environment: "node",
          // Os testes de banco fazem dezenas de round-trips ao Neon; os 5 s
          // padrão ficam a um pico de latência do estouro.
          testTimeout: 20_000,
          // Os arquivos de banco PRECISAM rodar em série: compartilham um branch,
          // e vários testes afirmam por diferença antes/depois ou sobre o alvo
          // global do desfazer. Aqui, e não só na flag do script, para que valha
          // também para quem rodar `vitest --project db` à mão.
          poolOptions: { forks: { singleFork: true } },
          include: ["src/**/*.db-test.ts"],
          globalSetup: [stub("global-setup.ts")],
          setupFiles: [stub("setup.ts")],
        },
      },
    ],
  },
});
