import pg from "pg";
import { env } from "@easysaas/config";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 15,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "easysaas",
});

export type DbClient = pg.PoolClient;
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, [...values]);
}
export async function transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function readinessProbe(): Promise<void> { await pool.query("SELECT 1"); }
export async function closeDatabase(): Promise<void> { await pool.end(); }
