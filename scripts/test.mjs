import { existsSync } from "node:fs";
import { projectRoot, rootPath } from "./lib/root.mjs";
import { run } from "./lib/process.mjs";

run(process.execPath, ["--test", "tests/bootstrap/env-file.test.mjs", "tests/bootstrap/version.test.mjs"], { cwd: projectRoot });
if (existsSync(rootPath("node_modules"))) {
  run("pnpm", ["-r", "--if-present", "test"], { cwd: projectRoot });
} else {
  console.warn("Dependências ausentes: testes dos apps foram adiados para o bootstrap.");
}
