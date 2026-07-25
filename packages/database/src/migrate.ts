import { closeDatabase } from "./index.js"; import { runMigrations } from "./migration-runner.js"; await runMigrations(); await closeDatabase();
