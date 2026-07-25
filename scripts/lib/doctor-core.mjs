import { access, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parseEnv } from "./env-file.mjs";
import { checkInternet, checkWritable, getFreeDiskBytes, canBind, canConnect } from "./checks.mjs";
import { commandExists } from "./process.mjs";
import { isSupportedNode } from "./version.mjs";
import { projectRoot, rootPath } from "./root.mjs";

function result(id, ok, level, message, detail) {
  return { id, ok, level, message, ...(detail ? { detail } : {}) };
}

export async function runDoctor({ phase = "default" } = {}) {
  const results = [];
  results.push(result("os", true, "info", `Sistema: ${process.platform} ${process.arch}`));

  const [nodeMajor,nodeMinor]=process.versions.node.split(".").map(Number);
  const nodeOk = isSupportedNode(process.versions.node, 24) && nodeMajor===24 && nodeMinor>=12;
  results.push(result("node", nodeOk, "critical", nodeOk ? `Node.js ${process.versions.node}` : `Node.js 24.12+ LTS obrigatório; encontrado ${process.versions.node}`, nodeOk ? undefined : "Use: nvm install 24.18.0 && nvm use 24.18.0 (ou instale o Node.js 24 LTS pelo site oficial)."));

  const corepackOk = commandExists("corepack");
  results.push(result("corepack", corepackOk, "critical", corepackOk ? "Corepack disponível" : "Corepack não encontrado na instalação do Node.js"));

  try {
    await checkWritable(projectRoot);
    await checkWritable(rootPath("runtime"));
    results.push(result("write", true, "critical", "Permissões de escrita aprovadas"));
  } catch (error) {
    results.push(result("write", false, "critical", "Sem permissão de escrita", String(error)));
  }

  try {
    const free = await getFreeDiskBytes(projectRoot);
    const minimum = 1024 ** 3;
    results.push(result("disk", free >= minimum, "critical", `${(free / 1024 ** 3).toFixed(2)} GiB livres`, free >= minimum ? undefined : "Mínimo recomendado: 1 GiB"));
  } catch (error) {
    results.push(result("disk", false, "warning", "Não foi possível medir o espaço em disco", String(error)));
  }

  const dependenciesInstalled = existsSync(rootPath("node_modules"));
  if (!dependenciesInstalled || phase === "preinstall") {
    try {
      await checkInternet();
      results.push(result("internet", true, "critical", "Acesso ao registro npm disponível"));
    } catch (error) {
      results.push(result("internet", false, "critical", "Sem acesso ao registro npm", "Verifique DNS, proxy, firewall e conexão com a internet."));
    }
  } else {
    results.push(result("internet", true, "info", "Dependências já instaladas; internet não é necessária para este diagnóstico"));
  }

  const envPath = rootPath(".env.local");
  let env = {};
  try {
    env = parseEnv(await readFile(envPath, "utf8"));
    results.push(result("env-file", true, "critical", ".env.local encontrado"));
  } catch {
    const critical = phase !== "preinstall";
    results.push(result("env-file", !critical, critical ? "critical" : "warning", ".env.local ainda não existe; execute o reparo"));
  }

  if (Object.keys(env).length > 0) {
    const sessionOk = Boolean(env.SESSION_SECRET && !env.SESSION_SECRET.startsWith("replace-") && env.SESSION_SECRET.length >= 48);
    const encryptionOk = Boolean(env.ENCRYPTION_KEY && !env.ENCRYPTION_KEY.startsWith("replace-") && env.ENCRYPTION_KEY.length >= 40);
    results.push(result("session-secret", sessionOk, "critical", sessionOk ? "SESSION_SECRET válido" : "SESSION_SECRET ausente ou inseguro"));
    results.push(result("encryption-key", encryptionOk, "critical", encryptionOk ? "ENCRYPTION_KEY válida" : "ENCRYPTION_KEY ausente ou insegura"));
    const setupOk = Boolean(env.SETUP_TOKEN && !env.SETUP_TOKEN.startsWith("replace-") && env.SETUP_TOKEN.length >= 32);
    results.push(result("setup-token", setupOk, "critical", setupOk ? "SETUP_TOKEN válido" : "SETUP_TOKEN ausente ou inseguro"));

    const webPort = Number(env.WEB_PORT || 3000);
    const apiPort = Number(env.API_PORT || 4000);
    const webFree = await canBind(env.WEB_HOST || "127.0.0.1", webPort);
    const apiFree = await canBind(env.API_HOST || "127.0.0.1", apiPort);
    results.push(result("web-port", webFree, "critical", webFree ? `Porta ${webPort} livre` : `Porta ${webPort} ocupada`, webFree ? undefined : `Libere a porta ou altere WEB_PORT e APP_URL em .env.local. Execute: node scripts/ports.mjs`));
    results.push(result("api-port", apiFree, "critical", apiFree ? `Porta ${apiPort} livre` : `Porta ${apiPort} ocupada`, apiFree ? undefined : `Libere a porta ou altere API_PORT e API_INTERNAL_URL em .env.local. Execute: node scripts/ports.mjs`));

    try {
      const dbUrl = new URL(env.DATABASE_URL);
      const dbHost = dbUrl.hostname;
      const dbPort = Number(dbUrl.port || 5432);
      const reachable = await canConnect(dbHost, dbPort, Number(env.DATABASE_CONNECT_TIMEOUT_MS || 3000));
      const level = phase === "preinstall" ? "warning" : "critical";
      results.push(result("postgres", reachable, level, reachable ? `PostgreSQL acessível em ${dbHost}:${dbPort}` : `PostgreSQL indisponível em ${dbHost}:${dbPort}`));
    } catch (error) {
      results.push(result("postgres", false, phase === "preinstall" ? "warning" : "critical", "DATABASE_URL inválida", String(error)));
    }
  }

  const required = ["package.json", "pnpm-workspace.yaml", "apps/web/package.json", "apps/api/package.json", "apps/worker/package.json"];
  for (const file of required) {
    try {
      await access(rootPath(file));
      results.push(result(`file:${file}`, true, "critical", `${file} encontrado`));
    } catch {
      results.push(result(`file:${file}`, false, "critical", `${file} ausente`));
    }
  }

  const failedCritical = results.some((item) => !item.ok && item.level === "critical");
  return { ok: !failedCritical, phase, results };
}
