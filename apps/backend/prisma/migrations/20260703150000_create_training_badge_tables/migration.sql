-- Create the base badge tables that later badge migrations extend.
CREATE TABLE `training_badges` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(80) NOT NULL,
  `name_zh` VARCHAR(120) NOT NULL,
  `name_en` VARCHAR(120) NOT NULL,
  `name_fr` VARCHAR(120) NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `training_badges_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_training_badges` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `badge_code` VARCHAR(80) NOT NULL,
  `earned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `user_training_badges_user_id_idx`(`user_id`),
  INDEX `user_training_badges_badge_code_idx`(`badge_code`),
  INDEX `user_training_badges_earned_at_idx`(`earned_at`),
  UNIQUE INDEX `user_training_badges_user_id_badge_code_key`(`user_id`, `badge_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_training_badges`
  ADD CONSTRAINT `user_training_badges_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_training_badges`
  ADD CONSTRAINT `user_training_badges_badge_code_fkey`
    FOREIGN KEY (`badge_code`) REFERENCES `training_badges`(`code`)
    ON DELETE CASCADE ON UPDATE CASCADE;
