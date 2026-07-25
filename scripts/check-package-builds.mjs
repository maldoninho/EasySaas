import { access } from "node:fs/promises";
import { rootPath } from "./lib/root.mjs";

const outputs = [
  "packages/config/dist/index.js",
  "packages/contracts/dist/index.js",
  "packages/core/dist/index.js",
  "packages/database/dist/index.js",
  "packages/module-sdk/dist/index.js",
  "packages/providers/dist/index.js",
  "packages/security/dist/index.js",
  "packages/ui/dist/index.js",
  "packages/validation/dist/index.js",
];

const missing = [];
for (const file of outputs) {
  try {
    await access(rootPath(file));
  } catch {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error("\n[ERRO] Packages compartilhados ainda não foram compilados:");
  for (const file of missing) console.error(`- ${file}`);
  console.error("\nExecute: pnpm packages:build\n");
  process.exit(1);
}

console.log("Packages compartilhados compilados e prontos.");
