CREATE TABLE `waiting_queue_entries` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `restaurant_id` INTEGER NOT NULL,
  `created_by_user_id` INTEGER NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `party_size` INTEGER NOT NULL,
  `has_disabled` BOOLEAN NOT NULL DEFAULT false,
  `has_pregnant` BOOLEAN NOT NULL DEFAULT false,
  `has_elderly` BOOLEAN NOT NULL DEFAULT false,
  `note` VARCHAR(500) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'waiting',
  `seated_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `waiting_queue_entries_restaurant_id_status_created_at_idx` (`restaurant_id`, `status`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `waiting_queue_entries`
  ADD CONSTRAINT `waiting_queue_entries_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `waiting_queue_entries`
  ADD CONSTRAINT `waiting_queue_entries_created_by_user_id_fkey`
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
