-- Create the missing training_badge_requirements table
CREATE TABLE `training_badge_requirements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `badge_code` VARCHAR(80) NOT NULL,
  `material_id` INT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `training_badge_requirements_badge_code_material_id_key`(`badge_code`, `material_id`),
  INDEX `training_badge_requirements_material_id_idx`(`material_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `training_badge_requirements`
  ADD CONSTRAINT `training_badge_requirements_badge_code_fkey`
    FOREIGN KEY (`badge_code`) REFERENCES `training_badges`(`code`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `training_badge_requirements`
  ADD CONSTRAINT `training_badge_requirements_material_id_fkey`
    FOREIGN KEY (`material_id`) REFERENCES `training_materials`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
