ALTER TABLE `dashboard_posts`
  ADD COLUMN `read_tracking_started_at` DATETIME(3) NULL;

CREATE TABLE `dashboard_post_read_receipts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `post_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `read_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `dashboard_post_read_receipts_post_id_user_id_key` (`post_id`, `user_id`),
  INDEX `dashboard_post_read_receipts_post_id_read_at_idx` (`post_id`, `read_at`),
  INDEX `dashboard_post_read_receipts_user_id_read_at_idx` (`user_id`, `read_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dashboard_post_read_receipts`
  ADD CONSTRAINT `dashboard_post_read_receipts_post_id_fkey`
  FOREIGN KEY (`post_id`) REFERENCES `dashboard_posts`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dashboard_post_read_receipts_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
