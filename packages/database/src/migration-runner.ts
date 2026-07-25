import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index.js";

// Localiza a pasta migrations relativa ao próprio pacote, não ao process.cwd()
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runMigrations(directory = resolve(packageRoot, "migrations")): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(resolve(directory, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await pool.query<{checksum:string}>("SELECT checksum FROM schema_migrations WHERE name=$1", [file]);
    if (existing.rowCount) {
      if (existing.rows[0]?.checksum !== checksum) throw new Error(`Migration já aplicada foi alterada: ${file}`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(name, checksum) VALUES ($1,$2)", [file, checksum]);
      await client.query("COMMIT");
      console.log(`Migration aplicada: ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
}
