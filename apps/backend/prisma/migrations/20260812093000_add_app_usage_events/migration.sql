CREATE TABLE `app_usage_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `module_name` VARCHAR(80) NOT NULL,
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `app_usage_events_occurred_at_idx`(`occurred_at`),
  INDEX `app_usage_events_user_id_occurred_at_idx`(`user_id`, `occurred_at`),
  INDEX `app_usage_events_module_name_occurred_at_idx`(`module_name`, `occurred_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_usage_events`
  ADD CONSTRAINT `app_usage_events_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
