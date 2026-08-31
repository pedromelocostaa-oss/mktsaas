import { defineConfig } from "vitest/config";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

// carrega .env.local à mão — evita depender de dotenv em devDeps
if (existsSync(path.resolve(__dirname, ".env.local"))) {
  const raw = readFileSync(path.resolve(__dirname, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      const v = m[2].replace(/^["'](.*)["']$/, "$1");
      process.env[m[1]] = v;
    }
  }
}

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
