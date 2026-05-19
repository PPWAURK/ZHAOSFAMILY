CREATE TABLE `dashboard_posts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(120) NOT NULL,
  `summary` VARCHAR(240) NOT NULL,
  `body` TEXT NOT NULL,
  `category` VARCHAR(40) NOT NULL,
  `visibility` VARCHAR(20) NOT NULL,
  `tags_json` VARCHAR(500) NOT NULL DEFAULT '[]',
  `attachment_name` VARCHAR(255) NULL,
  `attachment_mime_type` VARCHAR(100) NULL,
  `attachment_size_bytes` BIGINT NULL,
  `attachment_bucket` VARCHAR(100) NULL,
  `attachment_object_key` VARCHAR(500) NULL,
  `author_id` INTEGER NOT NULL,
  `restaurant_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `dashboard_posts_category_created_at_idx` (`category`, `created_at`),
  INDEX `dashboard_posts_visibility_created_at_idx` (`visibility`, `created_at`),
  INDEX `dashboard_posts_restaurant_id_created_at_idx` (`restaurant_id`, `created_at`),
  INDEX `dashboard_posts_author_id_idx` (`author_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dashboard_posts`
  ADD CONSTRAINT `dashboard_posts_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `dashboard_posts`
  ADD CONSTRAINT `dashboard_posts_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
