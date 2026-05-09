USE pesotrace;

ALTER TABLE users
  ADD COLUMN password_reset_token_hash CHAR(64) NULL AFTER password_hash,
  ADD COLUMN password_reset_expires_at DATETIME(3) NULL AFTER password_reset_token_hash,
  ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER password_reset_expires_at,
  ADD COLUMN login_locked_until DATETIME(3) NULL AFTER failed_login_attempts,
  ADD COLUMN failed_password_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER login_locked_until,
  ADD COLUMN password_locked_until DATETIME(3) NULL AFTER failed_password_attempts;

CREATE INDEX idx_users_password_reset_token
  ON users (password_reset_token_hash);
