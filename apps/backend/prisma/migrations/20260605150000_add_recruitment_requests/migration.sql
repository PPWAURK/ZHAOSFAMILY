CREATE TABLE `recruitment_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `restaurant_id` INTEGER NOT NULL,
  `created_by_user_id` INTEGER NOT NULL,
  `contract_type` VARCHAR(20) NOT NULL,
  `position` VARCHAR(40) NOT NULL,
  `headcount` INTEGER NOT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `handled_notes` TEXT NULL,
  `handled_by_user_id` INTEGER NULL,
  `handled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `recruitment_requests_status_created_at_idx` (`status`, `created_at`),
  INDEX `recruitment_requests_restaurant_id_created_at_idx` (`restaurant_id`, `created_at`),
  INDEX `recruitment_requests_created_by_user_id_idx` (`created_by_user_id`),
  INDEX `recruitment_requests_handled_by_user_id_idx` (`handled_by_user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `recruitment_requests`
  ADD CONSTRAINT `recruitment_requests_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `recruitment_requests`
  ADD CONSTRAINT `recruitment_requests_created_by_user_id_fkey`
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `recruitment_requests`
  ADD CONSTRAINT `recruitment_requests_handled_by_user_id_fkey`
  FOREIGN KEY (`handled_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
