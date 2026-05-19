CREATE TABLE `training_material_progress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  `progress_pct` INT NOT NULL DEFAULT 0,
  `last_opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `training_material_progress_user_id_material_id_key` (`user_id`, `material_id`),
  INDEX `training_material_progress_material_id_idx` (`material_id`),
  INDEX `training_material_progress_status_idx` (`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `training_material_progress`
  ADD CONSTRAINT `training_material_progress_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `training_material_progress`
  ADD CONSTRAINT `training_material_progress_material_id_fkey`
    FOREIGN KEY (`material_id`) REFERENCES `training_materials`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
