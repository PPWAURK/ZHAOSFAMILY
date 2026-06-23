CREATE TABLE `case_share_comments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `case_share_id` INTEGER NOT NULL,
  `author_id` INTEGER NOT NULL,
  `content` VARCHAR(300) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `case_share_comments_case_share_id_created_at_idx` (`case_share_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `case_share_likes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `case_share_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `case_share_likes_case_share_id_user_id_key` (`case_share_id`, `user_id`),
  INDEX `case_share_likes_user_id_created_at_idx` (`user_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `case_share_comments`
  ADD CONSTRAINT `case_share_comments_case_share_id_fkey`
  FOREIGN KEY (`case_share_id`) REFERENCES `case_shares`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `case_share_comments`
  ADD CONSTRAINT `case_share_comments_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `case_share_likes`
  ADD CONSTRAINT `case_share_likes_case_share_id_fkey`
  FOREIGN KEY (`case_share_id`) REFERENCES `case_shares`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `case_share_likes`
  ADD CONSTRAINT `case_share_likes_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
