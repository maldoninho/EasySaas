import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "./lib/env-file.mjs";

const envFile = resolve(process.cwd(), ".env.local");
const env = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const ports = [Number(env.WEB_PORT || 3000), Number(env.API_PORT || 4000)];

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  return `${result.stdout || ""}${result.stderr || ""}`.trim();
}

console.log("\nDiagnóstico de portas do EasySaaS\n");
if (process.platform === "win32") {
  const output = run("netstat", ["-ano", "-p", "tcp"]);
  for (const port of ports) {
    const lines = output.split(/\r?\n/).filter((line) => line.includes(`:${port} `) && /LISTENING/i.test(line));
    console.log(`Porta ${port}:`);
    if (lines.length === 0) console.log("  livre ou processo não identificado");
    for (const line of lines) {
      console.log(`  ${line.trim()}`);
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid) {
        const task = run("tasklist", ["/FI", `PID eq ${pid}`]);
        if (task) console.log(task.split(/\r?\n/).map((item) => `  ${item}`).join("\n"));
      }
    }
  }
  console.log("\nPara encerrar conscientemente um processo: taskkill /PID <PID> /F");
} else {
  for (const port of ports) {
    console.log(`Porta ${port}:`);
    const lsof = run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]);
    const ss = lsof || run("sh", ["-lc", `ss -ltnp 'sport = :${port}' 2>/dev/null || true`]);
    console.log(ss ? ss.split(/\r?\n/).map((item) => `  ${item}`).join("\n") : "  livre ou ferramenta de diagnóstico indisponível");
  }
  console.log("\nEncerre apenas o PID identificado, depois execute pnpm ports:check.");
}
