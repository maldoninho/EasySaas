import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { projectRoot, rootPath } from "./lib/root.mjs";
import { run } from "./lib/process.mjs";
import { parseEnv } from "./lib/env-file.mjs";

// Carrega .env.local antes de build/typecheck/test para que os packages
// encontrem variáveis como DATABASE_URL mesmo quando executados de subdiretórios.
const envLocalPath = rootPath(".env.local");
if (existsSync(envLocalPath)) {
  const parsed = parseEnv(await readFile(envLocalPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  console.log("✓ .env.local carregado no ambiente do validate");
}

const localChecks = [
  [process.execPath, ["scripts/validate-contracts.mjs"]],
  [process.execPath, ["scripts/validate-structure.mjs"]],
  [process.execPath, ["scripts/validate-scripts.mjs"]],
  [process.execPath, ["scripts/validate-source.mjs"]],
  [process.execPath, ["--test", "tests/bootstrap/*.test.mjs"]],
];

for (const [command, args] of localChecks) {
  if (args.includes("tests/bootstrap/*.test.mjs")) {
    run(command, ["--test", "tests/bootstrap/env-file.test.mjs", "tests/bootstrap/version.test.mjs", "tests/bootstrap/env-process.test.mjs"], { cwd: projectRoot });
  } else {
    run(command, args, { cwd: projectRoot });
  }
}

if (existsSync(rootPath("node_modules"))) {
  run("pnpm", ["--filter", "./packages/**", "build"], { cwd: projectRoot });
  run("pnpm", ["-r", "--if-present", "typecheck"], { cwd: projectRoot });
  run("pnpm", ["-r", "--if-present", "test"], { cwd: projectRoot });
} else {
  console.warn("AVISO: dependências ausentes; typecheck e testes de apps serão executados após o primeiro bootstrap.");
}

console.log("\nValidação concluída.\n");
