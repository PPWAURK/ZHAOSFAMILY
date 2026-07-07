-- Add missing description columns to training_badges
ALTER TABLE `training_badges`
  ADD COLUMN `description_en` VARCHAR(500) NULL AFTER `name_fr`,
  ADD COLUMN `description_fr` VARCHAR(500) NULL AFTER `description_en`,
  ADD COLUMN `description_zh` VARCHAR(500) NULL AFTER `description_fr`;
