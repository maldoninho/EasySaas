import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

type EnvMap = Record<string, string>;
type MigrationRow = { name: string; checksum: string };

const { Client } = pg;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = findProjectRoot(packageRoot);
const envPath = resolve(projectRoot, ".env.local");

function findProjectRoot(start: string): string {
  let directory = start;
  for (let guard = 0; guard < 20; guard++) {
    if (existsSync(resolve(directory, "pnpm-workspace.yaml"))) return directory;
    const parent = resolve(directory, "..");
    if (parent === directory) break;
    directory = parent;
  }
  return process.cwd();
}

function parseEnv(text: string): EnvMap {
  const result: EnvMap = {};
  for (const originalLine of text.split(/\r?\n/u)) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function serializeEnv(values: EnvMap): string {
  return `# Gerado pelo EasySaaS. Não versionar este arquivo.\n${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function databaseNameFromUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  return decodeURIComponent(parsed.pathname.replace(/^\//u, ""));
}

function withDatabaseName(databaseUrl: string, databaseName: string): string {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${encodeURIComponent(databaseName)}`;
  return parsed.toString();
}

function replacementDatabaseName(originalName: string): string {
  const safeBase = originalName.replace(/[^a-zA-Z0-9_]/gu, "_").replace(/^_+/u, "") || "easysaas";
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/gu, "").slice(0, 14);
  return `${safeBase}_local_${timestamp}`.slice(0, 63);
}

async function calculateExpectedChecksums(): Promise<Map<string, string>> {
  const migrationsDirectory = resolve(packageRoot, "migrations");
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  const checksums = new Map<string, string>();
  for (const file of files) {
    const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
    checksums.set(file, createHash("sha256").update(sql).digest("hex"));
  }
  return checksums;
}

async function connect(databaseUrl: string): Promise<pg.Client> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function databaseExists(databaseUrl: string, databaseName: string): Promise<boolean> {
  const maintenanceUrl = withDatabaseName(databaseUrl, "postgres");
  const client = await connect(maintenanceUrl);
  try {
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    return (result.rowCount ?? 0) > 0;
  } finally {
    await client.end();
  }
}

async function createDatabase(databaseUrl: string, databaseName: string): Promise<void> {
  const maintenanceUrl = withDatabaseName(databaseUrl, "postgres");
  const client = await connect(maintenanceUrl);
  try {
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
}

async function checksumDrift(databaseUrl: string, expectedChecksums: Map<string, string>): Promise<string[]> {
  const client = await connect(databaseUrl);
  try {
    const table = await client.query("SELECT to_regclass('public.schema_migrations') AS name");
    if (!table.rows[0]?.name) return [];
    const applied = await client.query<MigrationRow>("SELECT name, checksum FROM schema_migrations");
    return applied.rows
      .filter((row) => expectedChecksums.has(row.name) && expectedChecksums.get(row.name) !== row.checksum)
      .map((row) => row.name);
  } finally {
    await client.end();
  }
}

function writeDatabaseUrl(env: EnvMap, databaseUrl: string): void {
  env.DATABASE_URL = databaseUrl;
  writeFileSync(envPath, serializeEnv(env), { encoding: "utf8", mode: 0o600 });
}

async function main(): Promise<void> {
  const env = parseEnv(readFileSync(envPath, "utf8"));
  const nodeEnv = process.env.NODE_ENV || env.NODE_ENV || "development";
  if (nodeEnv === "production") {
    console.log("Banco: preparo local ignorado em produção.");
    return;
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL ausente em .env.local.");

  const databaseName = databaseNameFromUrl(databaseUrl);
  const expectedChecksums = await calculateExpectedChecksums();

  if (!(await databaseExists(databaseUrl, databaseName))) {
    await createDatabase(databaseUrl, databaseName);
    console.log(`Banco local criado: ${databaseName}`);
    return;
  }

  const drift = await checksumDrift(databaseUrl, expectedChecksums);
  if (drift.length === 0) {
    console.log("Banco local pronto para migrations.");
    return;
  }

  const newDatabaseName = replacementDatabaseName(databaseName);
  const newDatabaseUrl = withDatabaseName(databaseUrl, newDatabaseName);
  await createDatabase(databaseUrl, newDatabaseName);
  writeDatabaseUrl(env, newDatabaseUrl);
  console.log(`Banco local antigo preservado: ${databaseName}`);
  console.log(`Banco local novo configurado em .env.local: ${newDatabaseName}`);
  console.log(`Motivo: migrations já aplicadas com checksum antigo (${drift.join(", ")}).`);
}

await main();
