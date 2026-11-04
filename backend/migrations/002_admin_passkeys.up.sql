-- 002_admin_passkeys.up.sql
-- Master SecOps Passkey Enrollment for Touch ID & WebAuthn Biometrics
CREATE TABLE IF NOT EXISTS admin_passkeys (
    id TEXT PRIMARY KEY,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT,
    user_handle TEXT,
    sign_count INTEGER DEFAULT 0,
    device_name TEXT,
    created_at TEXT NOT NULL,
    last_used_at TEXT
);
