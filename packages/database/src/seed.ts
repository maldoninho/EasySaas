import { randomBytes } from "node:crypto";
import { query, pool, closeDatabase } from "./index.js";
import { hashPassword, tokenHash } from "@easysaas/security";

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

async function hasPendingActivation(): Promise<boolean> {
  const result = await query(
    "SELECT id FROM users WHERE status = 'pending_activation' ORDER BY created_at ASC LIMIT 1"
  );
  return result.rows.length > 0;
}

function generateSecurePassword(): string {
  // 24 caracteres seguros: maiúsculas, minúsculas, números, sem ambigüidade visual
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  const bytes = new Uint8Array(randomBytes(32));
  for (let i = 0; i < 24; i++) {
    pwd += chars[bytes[i]! % chars.length];
  }
  return pwd;
}

async function createSuperAdmin() {
  const tempPassword = generateSecurePassword();
  const activationToken = randomBytes(32).toString("base64url"); // 256 bits

  const tempPasswordHash = await hashPassword(tempPassword);
  const activationTokenHash = tokenHash(activationToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const user = await client.query(
      `INSERT INTO users (
        email, name, password_hash, status,
        must_change_password, must_verify_email, must_enable_mfa,
        activation_token_hash, activation_token_expires_at,
        temporary_password_hash
      ) VALUES ($1, $2, $3, 'pending_activation', true, true, false, $4, $5, $6)
      RETURNING id`,
      ["superadmin@local.easysaas", "Super Admin", tempPasswordHash,
       activationTokenHash, expiresAt, tempPasswordHash]
    );
    const userId = user.rows[0].id;

    await client.query("INSERT INTO user_preferences(user_id) VALUES ($1)", [userId]);
    await client.query(
      "INSERT INTO user_roles(user_id, role_id, assigned_by) SELECT $1, id, $1 FROM roles WHERE key = 'owner'",
      [userId]
    );

    await client.query("COMMIT");

    // Saída formatada das credenciais
    const line = "═".repeat(58);
    console.log(`\n${line}`);
    console.log("  🚀  SUPER ADMIN CRIADO AUTOMATICAMENTE");
    console.log(line);
    console.log(`  Usuário:        superadmin`);
    console.log(`  E-mail:         superadmin@local.easysaas`);
    console.log(`  Senha:          ${tempPassword}`);
    console.log(`  Token ativação: ${activationToken}`);
    console.log(`  URL:            http://localhost:3000/primeiro-acesso`);
    console.log(`  Expira em:      ${expiresAt.toISOString()}`);
    console.log(line);
    console.log("  ⚠  Credenciais de uso único. Guarde-as com segurança.");
    console.log("  Acesse a URL acima para ativar sua conta.\n");

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function revokeAndRecreate() {
  const result = await query(
    "SELECT id FROM users WHERE status = 'pending_activation' ORDER BY created_at ASC LIMIT 1"
  );
  if (result.rows.length === 0) return;

  const userId = result.rows[0]!.id;
  const tempPassword = generateSecurePassword();
  const activationToken = randomBytes(32).toString("base64url");
  const tempPasswordHash = await hashPassword(tempPassword);
  const activationTokenHash = tokenHash(activationToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await query(
    `UPDATE users SET
      password_hash = $1, temporary_password_hash = $1,
      activation_token_hash = $2, activation_token_expires_at = $3,
      updated_at = now()
    WHERE id = $4`,
    [tempPasswordHash, activationTokenHash, expiresAt, userId]
  );
  await query("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [userId]);

  const line = "═".repeat(58);
  console.log(`\n${line}`);
  console.log("  🔄  CREDENCIAIS REGENERADAS");
  console.log(line);
  console.log(`  Usuário:        superadmin`);
  console.log(`  E-mail:         superadmin@local.easysaas`);
  console.log(`  Senha:          ${tempPassword}`);
  console.log(`  Token ativação: ${activationToken}`);
  console.log(`  URL:            http://localhost:3000/primeiro-acesso`);
  console.log(`  Expira em:      ${expiresAt.toISOString()}`);
  console.log(line);
  console.log("  ⚠  Credenciais anteriores revogadas. Use as novas.\n");
}

// --- Execução principal do seed ---
const exists = await ownerExists();
if (exists) {
  console.log("✓ Proprietário já existe. Seed concluído.");
} else {
  const pending = await hasPendingActivation();
  if (pending) {
    console.log("○ Conta pendente encontrada. Regenerando credenciais...");
    await revokeAndRecreate();
  } else {
    console.log("○ Nenhum proprietário encontrado. Criando Super Admin...");
    await createSuperAdmin();
  }
}

await closeDatabase();
