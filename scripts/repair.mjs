import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parseEnv, writeEnvFile } from "./lib/env-file.mjs";
import { rootPath } from "./lib/root.mjs";

const runtimeDirectories = [
  "runtime/staging",
  "runtime/module-store",
  "runtime/validation",
  "runtime/backups",
  "runtime/logs",
  "runtime/tmp",
  "runtime/storage",
  "runtime/mail-outbox",
  "runtime/quarantine",
];

for (const directory of runtimeDirectories) {
  await mkdir(rootPath(directory), { recursive: true });
}

const example = parseEnv(await readFile(rootPath(".env.example"), "utf8"));
const envPath = rootPath(".env.local");
let current = {};
if (existsSync(envPath)) {
  current = parseEnv(await readFile(envPath, "utf8"));
}

const values = { ...example, ...current };
values.EASYSAAS_ROOT = rootPath();
values.INSTALLATION_ID ||= randomUUID();
if (!values.SETUP_TOKEN || values.SETUP_TOKEN.startsWith("replace-")) {
  values.SETUP_TOKEN = randomBytes(32).toString("base64url");
}
if (!values.SESSION_SECRET || values.SESSION_SECRET.startsWith("replace-")) {
  values.SESSION_SECRET = randomBytes(48).toString("base64url");
}
if (!values.ENCRYPTION_KEY || values.ENCRYPTION_KEY.startsWith("replace-")) {
  values.ENCRYPTION_KEY = randomBytes(32).toString("base64url");
}

await writeEnvFile(envPath, values);
console.log("Reparo concluído:");
console.log("- diretórios de runtime verificados");
console.log("- .env.local criado ou normalizado");
console.log("- segredos e token de primeiro acesso gerados com criptografia segura");
console.log("Nenhum software de sistema foi instalado ou alterado.");
