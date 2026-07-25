import { env } from "@easysaas/config";
import { query } from "@easysaas/database";
import { HttpError } from "../lib/http.js";

export interface SecurityPolicy {
  captchaMode: "off" | "adaptive" | "always";
  singleSession: boolean;
  publicSignup: boolean;
  sessionTtlHours: number;
  adminMfaRequired: boolean;
  mfaPolicy: "disabled" | "optional" | "owner-only" | "selected-roles" | "all";
}

export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  const result = await query<{ value: Record<string, unknown> }>("SELECT value FROM system_settings WHERE key='security'");
  const value = result.rows[0]?.value ?? {};
  const mode = String(value.captchaMode ?? "");
  const captchaMode: SecurityPolicy["captchaMode"] =
    mode === "adaptive" || mode === "always" || mode === "off" ? mode : env.captchaMode as SecurityPolicy["captchaMode"];
  const rawMfaPolicy = value.mfaPolicy;
  const mfaPolicy: SecurityPolicy["mfaPolicy"] =
    rawMfaPolicy === "disabled" || rawMfaPolicy === "optional" || rawMfaPolicy === "owner-only" ||
    rawMfaPolicy === "selected-roles" || rawMfaPolicy === "all"
      ? rawMfaPolicy
      : env.mfaRequiredForAdmins
        ? "all"
        : "optional";
  return {
    captchaMode,
    singleSession: typeof value.singleSession === "boolean" ? value.singleSession : env.singleSession,
    publicSignup: typeof value.publicSignup === "boolean" ? value.publicSignup : env.publicSignup,
    sessionTtlHours: typeof value.sessionTtlHours === "number" && value.sessionTtlHours >= 1 && value.sessionTtlHours <= 168 ? value.sessionTtlHours : env.sessionTtlHours,
    adminMfaRequired: mfaPolicy !== "disabled" && mfaPolicy !== "optional",
    mfaPolicy,
  };
}

export async function verifyCaptcha(token: string | undefined, remoteIp: string): Promise<void> {
  const isDev = env.nodeEnv === "development";

  // Development mode: auto-accept if no provider configured
  if (isDev && (env.captchaProvider === "off" || !env.captchaSecretKey)) {
    console.warn("[CAPTCHA] Modo de desenvolvimento: validação automática. NÃO use em produção.");
    return;
  }

  // Production: require real provider
  if (!isDev && (env.captchaProvider === "off" || !env.captchaSecretKey)) {
    throw new HttpError(503, "CAPTCHA_NOT_CONFIGURED",
      "CAPTCHA está ativo mas nenhum provedor foi configurado. Configure CAPTCHA_PROVIDER e CAPTCHA_SECRET_KEY.");
  }

  // Token presence check
  if (!token) throw new HttpError(403, "CAPTCHA_REQUIRED", "Conclua a verificação anti-robô.");

  if (env.captchaProvider === "turnstile") {
    const form = new URLSearchParams({
      secret: env.captchaSecretKey!,
      response: token,
      remoteip: remoteIp,
    });
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8_000),
    });
    const payload = await response.json() as { success?: boolean; "error-codes"?: string[] };
    if (!payload.success) {
      throw new HttpError(403, "CAPTCHA_INVALID", "A verificação anti-robô não foi aprovada.");
    }
    return;
  }

  // Unknown provider
  throw new HttpError(503, "CAPTCHA_PROVIDER_UNKNOWN",
    `Provedor CAPTCHA desconhecido: ${env.captchaProvider}. Configure um provedor válido.`);
}
