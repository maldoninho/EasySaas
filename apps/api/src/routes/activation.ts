import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { env } from "@easysaas/config";
import { writeAudit } from "@easysaas/core";
import { query, transaction } from "@easysaas/database";
import { hashIp, hashPassword, randomToken, tokenHash, validatePassword, verifyPassword } from "@easysaas/security";
import { assert, email, jsonBody, ok, optionalText, text } from "../lib/http.js";
import { getSecurityPolicy, verifyCaptcha } from "../services/security-policy.js";
import { createSession } from "../services/session.js";

function isLoopback(ip: string): boolean { return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1"; }
function originalClientIp(request: import("fastify").FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  return first || request.ip;
}

export async function activationRoutes(app: FastifyInstance): Promise<void> {
  // --- GET /api/v1/setup/pending-admin ---
  // Checks if there is a pending activation admin (for the frontend to determine what to show)
  app.get("/api/v1/setup/pending-admin", async (_request, reply) => {
    const result = await query<{ complete: boolean }>(
      "SELECT COALESCE((value->>'setupComplete')::boolean,false) complete FROM system_settings WHERE key='installation'"
    );
    const setupComplete = result.rows[0]?.complete ?? false;

    const pending = await query<{ id: string; email: string; name: string }>(
      "SELECT id, email::text, name FROM users WHERE status = 'pending_activation' ORDER BY created_at ASC LIMIT 1"
    );

    if (pending.rows.length > 0) {
      const user = pending.rows[0]!;
      return ok(reply, {
        pending: true,
        setupComplete,
        user: { id: user.id, email: user.email, name: user.name },
      });
    }

    return ok(reply, { pending: false, setupComplete });
  });

  // --- POST /api/v1/setup/validate-temp ---
  // Step 1: validate temp credentials, create verification token
  app.post("/api/v1/setup/validate-temp", {
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (request, reply) => {
    const body = jsonBody(request);
    const suppliedToken = text(body.activationToken, "Token de ativação", 10, 200);
    const suppliedPassword = text(body.tempPassword, "Senha temporária", 1, 128);
    const captchaToken = optionalText(body.captchaToken, 3000);
    const isLocal = isLoopback(originalClientIp(request));
    const policy = await getSecurityPolicy();
    if (policy.captchaMode !== "off") await verifyCaptcha(captchaToken, request.ip);

    const userResult = await query<{
      id: string;
      email: string;
      name: string;
      activation_token_hash: string | null;
      activation_token_expires_at: Date | null;
      temporary_password_hash: string | null;
    }>(
      `SELECT id, email::text, name,
              activation_token_hash, activation_token_expires_at,
              temporary_password_hash
       FROM users WHERE status = 'pending_activation'
       ORDER BY created_at ASC LIMIT 1`
    );

    assert(userResult.rows.length > 0, 400, "NO_PENDING_ADMIN",
      "Nenhum administrador pendente de ativação encontrado. Execute o seed novamente.");

    const user = userResult.rows[0]!;

    // Validate activation token
    const tokenHash_expected = tokenHash(suppliedToken);
    assert(
      user.activation_token_hash && tokenHash_expected === user.activation_token_hash,
      400, "INVALID_ACTIVATION_TOKEN", "Token de ativação inválido."
    );

    // Check expiry
    if (user.activation_token_expires_at) {
      assert(
        new Date(user.activation_token_expires_at) > new Date(),
        400, "ACTIVATION_TOKEN_EXPIRED",
        "Token de ativação expirado. Execute o comando de recuperação de administrador."
      );
    }

    // Validate temp password
    assert(
      user.temporary_password_hash && await verifyPassword(user.temporary_password_hash, suppliedPassword),
      400, "INVALID_TEMP_PASSWORD", "Senha temporária inválida."
    );

    // Create a verification token for the activation flow (expires in 1 hour)
    const flowToken = randomToken();
    await query(
      `INSERT INTO verification_tokens(user_id, token_hash, purpose, expires_at)
       VALUES ($1, $2, 'activation', now() + interval '1 hour')`,
      [user.id, tokenHash(flowToken)]
    );

    await writeAudit({
      actorUserId: user.id,
      action: "activation.temp_validated",
      targetType: "user",
      targetId: user.id,
      requestId: request.id,
      ipHash: hashIp(isLocal ? "127.0.0.1" : request.ip, env.sessionSecret),
    });

    return ok(reply, {
      valid: true,
      token: flowToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  // --- POST /api/v1/setup/complete-activation ---
  // Step 2: set new password, update profile, activate account (no MFA required)
  app.post("/api/v1/setup/complete-activation", {
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (request, reply) => {
    const body = jsonBody(request);
    const flowToken = text(body.token, "Token de ativação", 10, 200);
    const newPassword = text(body.newPassword, "Nova senha", 12, 128);
    const updatedEmail = email(body.email);
    const updatedName = text(body.name, "Nome", 2, 100);
    const acceptedTerms = body.acceptedTerms === true;
    const acceptedPrivacy = body.acceptedPrivacy === true;
    const captchaToken = optionalText(body.captchaToken, 3000);
    const policy = await getSecurityPolicy();
    if (policy.captchaMode !== "off") await verifyCaptcha(captchaToken, request.ip);

    assert(acceptedTerms, 400, "TERMS_REQUIRED", "Aceite os termos de uso para continuar.");
    assert(acceptedPrivacy, 400, "PRIVACY_REQUIRED", "Aceite a política de privacidade para continuar.");

    const pwdErrors = validatePassword(newPassword);
    assert(pwdErrors.length === 0, 400, "WEAK_PASSWORD", "A senha não atende aos requisitos.", pwdErrors);

    const userId = await transaction(async (client) => {
      const userResult = await client.query<{ id: string; status: string }>(
        "SELECT id, status FROM users WHERE status = 'pending_activation' ORDER BY created_at ASC LIMIT 1 FOR UPDATE"
      );
      assert(userResult.rows.length > 0, 400, "NO_PENDING_ADMIN",
        "Nenhum administrador pendente de ativação encontrado.");

      const user = userResult.rows[0]!;

      // Validate the flow token
      const vtResult = await client.query<{ id: string }>(
        `SELECT id FROM verification_tokens
         WHERE user_id = $1 AND token_hash = $2
         AND purpose = 'activation' AND consumed_at IS NULL AND expires_at > now()
         FOR UPDATE`,
        [user.id, tokenHash(flowToken)]
      );
      assert(vtResult.rows.length > 0, 400, "INVALID_TOKEN",
        "Token de ativação inválido ou expirado. Volte ao passo anterior.");

      const vtRow = vtResult.rows[0]!;
      const newHash = await hashPassword(newPassword);

      // Activate user — no MFA required by default
      await client.query(
        `UPDATE users SET
          email = $1, name = $2,
          password_hash = $3, temporary_password_hash = NULL,
          activation_token_hash = NULL, activation_token_expires_at = NULL,
          status = 'active', email_verified_at = now(),
          must_change_password = false, must_verify_email = false, must_enable_mfa = false,
          activated_at = now(), mfa_enabled_at = NULL,
          password_changed_at = now(),
          accepted_terms_at = now(), accepted_privacy_at = now(),
          failed_login_count = 0, locked_until = NULL,
          updated_at = now()
        WHERE id = $4`,
        [updatedEmail, updatedName, newHash, user.id]
      );

      // Consume the verification token
      await client.query(
        "UPDATE verification_tokens SET consumed_at = now() WHERE id = $1",
        [vtRow.id]
      );

      // Mark setup as complete
      await client.query(
        `INSERT INTO system_settings(key, value, updated_at)
         VALUES ('installation', jsonb_build_object('setupComplete', true), now())
         ON CONFLICT (key) DO UPDATE
         SET value = jsonb_build_object('setupComplete', true), updated_at = now()`
      );

      return user.id;
    });

    await createSession({ userId, request, reply });

    await writeAudit({
      actorUserId: userId,
      action: "activation.completed",
      targetType: "user",
      targetId: userId,
      requestId: request.id,
      ipHash: hashIp(request.ip, env.sessionSecret),
    });

    return ok(reply, {
      activated: true,
      redirectTo: "/admin",
    }, 201);
  });

  // --- POST /api/v1/setup/recover-admin ---
  // Emergency recovery: regenerates admin credentials (loopback only)
  app.post("/api/v1/setup/recover-admin", {
    config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
  }, async (request, reply) => {
    assert(
      isLoopback(originalClientIp(request)),
      403, "LOCAL_ONLY",
      "A recuperação de administrador só pode ser feita localmente no servidor."
    );

    const userResult = await query<{ id: string; email: string; name: string; status: string }>(
      "SELECT u.id, u.email::text, u.name, u.status FROM user_roles ur JOIN users u ON u.id = ur.user_id JOIN roles r ON r.id = ur.role_id WHERE r.is_owner = true ORDER BY u.created_at ASC LIMIT 1"
    );

    assert(userResult.rows.length > 0, 404, "NO_OWNER_FOUND",
      "Nenhum proprietário encontrado. Execute o bootstrap primeiro.");

    const user = userResult.rows[0]!;
    const tempPassword = randomToken(24);
    const activationToken = randomBytes(32).toString("base64url");
    const tempPasswordHash = await hashPassword(tempPassword);
    const activationTokenHash = tokenHash(activationToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await transaction(async (client) => {
      // Revoke all existing sessions
      await client.query(
        "UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
        [user.id]
      );

      // Reset to pending_activation (preserves profile, only resets security)
      await client.query(
        `UPDATE users SET
          status = 'pending_activation',
          password_hash = $1, temporary_password_hash = $1,
          activation_token_hash = $2, activation_token_expires_at = $3,
          must_change_password = true, must_verify_email = true, must_enable_mfa = false,
          activated_at = NULL, mfa_enabled_at = NULL, email_verified_at = NULL,
          password_changed_at = NULL,
          accepted_terms_at = NULL, accepted_privacy_at = NULL,
          updated_at = now()
        WHERE id = $4`,
        [tempPasswordHash, activationTokenHash, expiresAt, user.id]
      );

      // Remove stale (unverified) MFA credentials
      await client.query(
        "DELETE FROM mfa_credentials WHERE user_id = $1 AND verified_at IS NULL",
        [user.id]
      );
    });

    await writeAudit({
      actorUserId: user.id,
      action: "admin.recovery.executed",
      targetType: "user",
      targetId: user.id,
      requestId: request.id,
      ipHash: hashIp("127.0.0.1", env.sessionSecret),
    });

    return ok(reply, {
      recovered: true,
      message: "Credenciais de administrador regeneradas com sucesso.",
      credentials: {
        username: user.email?.split("@")[0] ?? "superadmin",
        email: user.email,
        name: user.name,
        temporaryPassword: tempPassword,
        activationToken: activationToken,
        activationUrl: `${env.appUrl}/primeiro-acesso`,
        expiresAt: expiresAt.toISOString(),
      },
    });
  });
}
