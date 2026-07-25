import { fileURLToPath } from "node:url";
import { spawnLongRunning } from "./lib/process.mjs";

const mode = process.argv[2];
if (!new Set(["dev", "start"]).has(mode)) throw new Error("Uso: node scripts/run-web.mjs dev|start");

const host = process.env.WEB_HOST || "127.0.0.1";
const port = process.env.WEB_PORT || "3000";
const child = spawnLongRunning("next", [mode, "--hostname", host, "--port", port], {
  cwd: fileURLToPath(new URL("../apps/web", import.meta.url)),
  env: process.env,
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
