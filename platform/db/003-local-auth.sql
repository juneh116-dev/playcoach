BEGIN;
CREATE TABLE IF NOT EXISTS pc_credentials (
 email TEXT PRIMARY KEY,
 member_id TEXT NOT NULL UNIQUE REFERENCES pc_members(id),
 password_hash TEXT NOT NULL,
 created BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS pc_auth_limits (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 resets BIGINT NOT NULL
);
COMMIT;
