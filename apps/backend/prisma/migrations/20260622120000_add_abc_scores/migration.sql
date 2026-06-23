CREATE TABLE `abc_score_cycles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(120) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `published_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `abc_score_cycles_status_created_at_idx`(`status`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `abc_store_scores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cycle_id` INT NOT NULL,
  `restaurant_id` INT NOT NULL,
  `marketing_score` INT NULL,
  `marketing_notes` TEXT NULL,
  `marketing_filled_by_user_id` INT NULL,
  `marketing_filled_at` DATETIME(3) NULL,
  `operations_score` INT NULL,
  `operations_notes` TEXT NULL,
  `operations_filled_by_user_id` INT NULL,
  `operations_filled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `abc_store_scores_restaurant_id_idx`(`restaurant_id`),
  UNIQUE INDEX `abc_store_scores_cycle_id_restaurant_id_key`(`cycle_id`, `restaurant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `abc_score_media` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `store_score_id` INT NOT NULL,
  `object_key` VARCHAR(512) NOT NULL,
  `file_name` VARCHAR(255) NULL,
  `department` VARCHAR(20) NOT NULL DEFAULT 'operations',
  `uploaded_by_user_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `abc_score_media_store_score_id_idx`(`store_score_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `abc_store_scores`
  ADD CONSTRAINT `abc_store_scores_cycle_id_fkey`
  FOREIGN KEY (`cycle_id`) REFERENCES `abc_score_cycles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `abc_store_scores`
  ADD CONSTRAINT `abc_store_scores_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `abc_score_media`
  ADD CONSTRAINT `abc_score_media_store_score_id_fkey`
  FOREIGN KEY (`store_score_id`) REFERENCES `abc_store_scores`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
