ALTER TABLE `users`
  ADD COLUMN `invitation_token_hash` VARCHAR(64) NULL,
  ADD COLUMN `invitation_expires_at` DATETIME(3) NULL,
  ADD COLUMN `password_reset_token_hash` VARCHAR(64) NULL,
  ADD COLUMN `password_reset_expires_at` DATETIME(3) NULL;

CREATE INDEX `users_invitation_token_hash_idx` ON `users`(`invitation_token_hash`);
CREATE INDEX `users_password_reset_token_hash_idx` ON `users`(`password_reset_token_hash`);
