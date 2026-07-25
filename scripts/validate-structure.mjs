import { access, readFile } from "node:fs/promises";
import { rootPath } from "./lib/root.mjs";

const requiredFiles = [
  "AGENTS.md", "README.md", "README-INSTALL.md", "README-PRODUCTION.md",
  "package.json", "pnpm-workspace.yaml", "start.cmd", "start.sh",
  "apps/web/package.json", "apps/web/app/page.tsx", "apps/web/app/app/layout.tsx", "apps/web/app/admin/layout.tsx",
  "apps/api/package.json", "apps/api/src/app.ts", "apps/worker/package.json", "apps/worker/src/worker.ts",
  "packages/config/package.json", "packages/database/package.json", "packages/contracts/src/module.schema.json",
  "packages/core/package.json", "packages/security/package.json", "packages/validation/package.json",
  "packages/module-sdk/package.json", "packages/providers/package.json", "runtime/active-modules.json",
  "standards/ARCHITECTURE_STANDARD.md", "standards/MODULE_STANDARD.md", "standards/SECURITY_STANDARD.md"
];
for (const file of requiredFiles) await access(rootPath(file));

const rootPackage = JSON.parse(await readFile(rootPath("package.json"), "utf8"));
if (rootPackage.packageManager !== "pnpm@11.15.1") throw new Error("packageManager deve ser pnpm@11.15.1");
if (rootPackage.engines?.node !== ">=24.12.0 <25") throw new Error("Node.js deve estar fixado em >=24.12.0 <25");

const packageFiles = [
  "apps/web/package.json", "apps/api/package.json", "apps/worker/package.json",
  "packages/config/package.json", "packages/database/package.json", "packages/contracts/package.json",
  "packages/core/package.json", "packages/security/package.json", "packages/validation/package.json",
  "packages/module-sdk/package.json", "packages/providers/package.json", "packages/ui/package.json"
];
const names = new Set();
for (const file of packageFiles) {
  const pkg = JSON.parse(await readFile(rootPath(file), "utf8"));
  if (!pkg.name) throw new Error(`Pacote sem nome: ${file}`);
  if (names.has(pkg.name)) throw new Error(`Nome de pacote duplicado: ${pkg.name}`);
  names.add(pkg.name);
}
console.log(`Estrutura final validada: ${requiredFiles.length} arquivos críticos e ${names.size} pacotes.`);
