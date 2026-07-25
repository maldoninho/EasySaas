-- Migration: 0004_remove_mfa
-- Remove os artefatos de MFA/TOTP do schema ativo.

DROP TABLE IF EXISTS recovery_codes;
DROP TABLE IF EXISTS mfa_credentials;

ALTER TABLE users DROP COLUMN IF EXISTS must_enable_mfa;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled_at;

UPDATE system_settings
SET value = value - 'adminMfaRequired' - 'mfaPolicy',
    updated_at = now()
WHERE key = 'security';
