import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(): string {
  // Começa da pasta do próprio pacote (packages/config/src/)
  let dir = dirname(fileURLToPath(import.meta.url));
  let guard = 0;
  while (dir !== "/" && guard < 20) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    dir = resolve(dir, "..");
    guard++;
  }
  // Fallback: usa process.cwd()
  return process.cwd();
}

function loadEnvFile(): void {
  // Prioridade: 1) process.env já definido  2) .env.local na raiz do monorepo
  const projectRoot = findMonorepoRoot();
  const candidates = [
    resolve(projectRoot, ".env.local"),
    resolve(projectRoot, ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ];
  const seen = new Set<string>();
  for (const file of candidates) {
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index < 1) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Só define se ainda não estiver em process.env
      process.env[key] ??= value;
    }
    // Para no primeiro arquivo encontrado (prioridade: monorepo raiz)
    return;
  }
}

loadEnvFile();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}
function text(name: string, fallback: string): string { return process.env[name]?.trim() || fallback; }
function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  throw new Error(`Booleano inválido em ${name}`);
}
function integer(name: string, fallback: number, min = 0): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) throw new Error(`Inteiro inválido em ${name}`);
  return parsed;
}

export const env = Object.freeze({
  nodeEnv: text("NODE_ENV", "development"),
  appName: text("APP_NAME", "EasySaaS"),
  appUrl: text("APP_URL", "http://localhost:3000"),
  apiInternalUrl: text("API_INTERNAL_URL", "http://127.0.0.1:4000"),
  webPort: integer("WEB_PORT", 3000, 1),
  apiHost: text("API_HOST", "127.0.0.1"),
  apiPort: integer("API_PORT", 4000, 1),
  databaseUrl: required("DATABASE_URL"),
  databaseSsl: bool("DATABASE_SSL", false),
  sessionSecret: required("SESSION_SECRET"),
  setupToken: required("SETUP_TOKEN"),
  encryptionKey: required("ENCRYPTION_KEY"),
  cookieSecure: bool("COOKIE_SECURE", false),
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  sessionTtlHours: integer("SESSION_TTL_HOURS", 12, 1),
  singleSession: bool("SINGLE_SESSION", true),
  publicSignup: bool("PUBLIC_SIGNUP", false),
  landingEnabled: bool("LANDING_ENABLED", true),
  captchaMode: text("CAPTCHA_MODE", "always"),
  captchaProvider: text("CAPTCHA_PROVIDER", "off"),
  captchaEnabled: bool("CAPTCHA_ENABLED", true),
  mfaEnabled: bool("MFA_ENABLED", false),
  mfaRequiredForAdmins: bool("MFA_REQUIRED_FOR_ADMINS", false),
  mfaRequiredForUsers: bool("MFA_REQUIRED_FOR_USERS", false),
  captchaSiteKey: process.env.CAPTCHA_SITE_KEY?.trim() || undefined,
  captchaSecretKey: process.env.CAPTCHA_SECRET_KEY?.trim() || undefined,
  smtpMode: text("SMTP_MODE", "file"),
  smtpHost: process.env.SMTP_HOST?.trim() || undefined,
  smtpPort: integer("SMTP_PORT", 587, 1),
  smtpSecure: bool("SMTP_SECURE", false),
  smtpUser: process.env.SMTP_USER?.trim() || undefined,
  smtpPassword: process.env.SMTP_PASSWORD || undefined,
  smtpFrom: text("SMTP_FROM", "EasySaaS <no-reply@example.local>"),
  storageDriver: text("STORAGE_DRIVER", "local"),
  storageLocalPath: text("STORAGE_LOCAL_PATH", "runtime/storage"),
  maxUploadMb: integer("MAX_UPLOAD_MB", 25, 1),
  moduleValidationTimeoutMs: integer("MODULE_VALIDATION_TIMEOUT_MS", 120000, 1000),
  moduleMaxFiles: integer("MODULE_MAX_FILES", 500, 1),
  moduleMaxExtractedMb: integer("MODULE_MAX_EXTRACTED_MB", 100, 1),
  moduleAllowNetwork: bool("MODULE_ALLOW_NETWORK", false),
  backupRetentionDays: integer("BACKUP_RETENTION_DAYS", 14, 1),
  logLevel: text("LOG_LEVEL", "info"),
  trustProxy: bool("TRUST_PROXY", false),
});
export type AppEnv = typeof env;
