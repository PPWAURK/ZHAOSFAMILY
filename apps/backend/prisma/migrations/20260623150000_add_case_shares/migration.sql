CREATE TABLE `case_shares` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `author_id` INTEGER NOT NULL,
  `restaurant_id` INTEGER NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `content` TEXT NOT NULL,
  `image_bucket` VARCHAR(100) NULL,
  `image_object_key` VARCHAR(500) NULL,
  `image_name` VARCHAR(255) NULL,
  `image_mime_type` VARCHAR(100) NULL,
  `image_size_bytes` BIGINT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `review_note` TEXT NULL,
  `reviewed_by_user_id` INTEGER NULL,
  `reviewed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `case_shares_status_reviewed_at_idx` (`status`, `reviewed_at`),
  INDEX `case_shares_author_id_created_at_idx` (`author_id`, `created_at`),
  INDEX `case_shares_restaurant_id_created_at_idx` (`restaurant_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `case_shares`
  ADD CONSTRAINT `case_shares_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `case_shares`
  ADD CONSTRAINT `case_shares_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `case_shares`
  ADD CONSTRAINT `case_shares_reviewed_by_user_id_fkey`
  FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
