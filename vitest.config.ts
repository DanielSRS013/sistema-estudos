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
            "@": src,
          },
        },
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db-test.ts"],
          globalSetup: [stub("global-setup.ts")],
          setupFiles: [stub("setup.ts")],
        },
      },
    ],
  },
});
