-- Migration: 0003_auto_setup
-- Adiciona suporte a Super Admin automático com ativação assistida

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('pending_activation','pending','active','blocked','disabled'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_verify_email boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_enable_mfa boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_expires_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS temporary_password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_privacy_at timestamptz;

CREATE INDEX IF NOT EXISTS users_activation_idx ON users(activation_token_hash) WHERE activation_token_hash IS NOT NULL;

-- Add 'activation' purpose to verification_tokens constraint
ALTER TABLE verification_tokens DROP CONSTRAINT IF EXISTS verification_tokens_purpose_check;
ALTER TABLE verification_tokens ADD CONSTRAINT verification_tokens_purpose_check
  CHECK (purpose IN ('verify_email','reset_password','accept_invite','change_email','activation'));
