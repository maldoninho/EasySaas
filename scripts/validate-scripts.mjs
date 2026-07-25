import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { projectRoot, rootPath } from "./lib/root.mjs";
import { run } from "./lib/process.mjs";

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await collect(path));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) result.push(path);
  }
  return result;
}

for (const file of await collect(rootPath("scripts"))) {
  run(process.execPath, ["--check", file], { cwd: projectRoot, capture: true });
  console.log(`✓ ${relative(projectRoot, file)}`);
}
console.log("Sintaxe dos scripts validada com sucesso.");
