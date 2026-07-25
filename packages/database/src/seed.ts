import { query, pool, closeDatabase } from "./index.js";
import { hashPassword, validatePassword } from "@easysaas/security";

const superAdminEmail = process.env.EASYSAAS_SUPERADMIN_EMAIL?.trim() || "superadmin@local.easysaas";
const superAdminName = process.env.EASYSAAS_SUPERADMIN_NAME?.trim() || "Super Admin";
const defaultLocalSuperAdminPassword = "TrocarSenha!2026";
const configuredSuperAdminPassword = process.env.EASYSAAS_SUPERADMIN_PASSWORD?.trim();
const superAdminPassword = configuredSuperAdminPassword || defaultLocalSuperAdminPassword;
const isProduction = process.env.NODE_ENV === "production";

// --- Permissões padrão ---
const permissions = [
  "admin.access","users.read","users.write","roles.read","roles.write","categories.read","categories.write",
  "modules.read","modules.write","modules.activate","landing.read","landing.write","company.read","company.write",
  "system.read","system.write","audit.read","backups.run","security.manage"
];
for (const key of permissions) {
  await query("INSERT INTO permissions(key, description) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING", [key, key]);
}

// --- Auto-setup: cria Super Admin se não existir ---
async function ownerExists(): Promise<boolean> {
  const result = await query(
    "SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.is_owner = true LIMIT 1"
  );
  return (result.rowCount ?? 0) > 0;
}

async function pendingActivationId(): Promise<string | undefined> {
  const result = await query<{ id: string }>(
    "SELECT id FROM users WHERE status = 'pending_activation' ORDER BY created_at ASC LIMIT 1"
  );
  return result.rows[0]?.id;
}

function assertSuperAdminPassword(): void {
  if (isProduction && (!configuredSuperAdminPassword || configuredSuperAdminPassword === defaultLocalSuperAdminPassword)) {
    throw new Error("Produção exige EASYSAAS_SUPERADMIN_PASSWORD explícita e diferente da senha padrão local.");
  }

  const errors = validatePassword(superAdminPassword);
  if (errors.length > 0) {
    throw new Error(`EASYSAAS_SUPERADMIN_PASSWORD não atende aos requisitos: ${errors.join(", ")}`);
  }
}

function printCredentials(title: string): void {
  const line = "═".repeat(62);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
  console.log("  Login:          superadmin");
  console.log(`  E-mail:         ${superAdminEmail}`);
  if (isProduction) {
    console.log("  Senha:          configurada por EASYSAAS_SUPERADMIN_PASSWORD (não exibida em produção)");
  } else {
    console.log(`  Senha:          ${superAdminPassword}`);
  }
  console.log("  URL:            http://localhost:3000/login");
  console.log(line);
  console.log("  ⚠  Credencial padrão para instalação local. Altere após entrar em produção.\n");
}

async function createSuperAdmin() {
  assertSuperAdminPassword();
  const passwordHash = await hashPassword(superAdminPassword);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const user = await client.query(
      `INSERT INTO users (
        email, name, password_hash, status,
        must_change_password, must_verify_email,
        activation_token_hash, activation_token_expires_at, temporary_password_hash,
        activated_at, email_verified_at, password_changed_at,
        accepted_terms_at, accepted_privacy_at
      ) VALUES ($1, $2, $3, 'active', false, false, NULL, NULL, NULL, now(), now(), now(), now(), now())
      RETURNING id`,
      [superAdminEmail, superAdminName, passwordHash]
    );
    const userId = user.rows[0].id;

    await client.query("INSERT INTO user_preferences(user_id) VALUES ($1)", [userId]);
    await client.query(
      "INSERT INTO user_roles(user_id, role_id, assigned_by) SELECT $1, id, $1 FROM roles WHERE key = 'owner'",
      [userId]
    );
    await client.query(
      "UPDATE system_settings SET value=jsonb_set(value,'{setupComplete}','true'::jsonb),updated_at=now() WHERE key='installation'"
    );

    await client.query("COMMIT");
    printCredentials("🚀  SUPER ADMIN PADRÃO CRIADO AUTOMATICAMENTE");

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function activatePendingSuperAdmin(userId: string) {
  assertSuperAdminPassword();
  const passwordHash = await hashPassword(superAdminPassword);

  await query(
    `UPDATE users SET
      email = $1,
      name = $2,
      password_hash = $3,
      temporary_password_hash = NULL,
      activation_token_hash = NULL,
      activation_token_expires_at = NULL,
      status = 'active',
      must_change_password = false,
      must_verify_email = false,
      activated_at = now(),
      email_verified_at = now(),
      password_changed_at = now(),
      accepted_terms_at = now(),
      accepted_privacy_at = now(),
      updated_at = now()
    WHERE id = $4`,
    [superAdminEmail, superAdminName, passwordHash, userId]
  );
  await query(
    "INSERT INTO user_roles(user_id, role_id, assigned_by) SELECT $1, id, $1 FROM roles WHERE key = 'owner' ON CONFLICT DO NOTHING",
    [userId]
  );
  await query(
    "UPDATE system_settings SET value=jsonb_set(value,'{setupComplete}','true'::jsonb),updated_at=now() WHERE key='installation'"
  );
  await query("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [userId]);
  printCredentials("🔄  SUPER ADMIN PENDENTE ATIVADO COM CREDENCIAL PADRÃO");
}

// --- Execução principal do seed ---
const exists = await ownerExists();
if (exists) {
  console.log("✓ Proprietário já existe. Seed concluído.");
} else {
  const pendingId = await pendingActivationId();
  if (pendingId) {
    console.log("○ Conta pendente encontrada. Ativando Super Admin padrão...");
    await activatePendingSuperAdmin(pendingId);
  } else {
    console.log("○ Nenhum proprietário encontrado. Criando Super Admin...");
    await createSuperAdmin();
  }
}

await closeDatabase();
