-- Add missing columns to training_badges for the current Prisma schema
ALTER TABLE `training_badges`
  ADD COLUMN `track` VARCHAR(40) NOT NULL DEFAULT 'general' AFTER `description_fr`,
  ADD COLUMN `rarity` VARCHAR(20) NOT NULL DEFAULT 'common' AFTER `track`,
  ADD COLUMN `level` INT NULL AFTER `rarity`,
  ADD COLUMN `icon_type` VARCHAR(40) NOT NULL DEFAULT 'default' AFTER `level`,
  ADD COLUMN `required_score` INT NOT NULL DEFAULT 80 AFTER `icon_type`,
  ADD COLUMN `required_completion_rate` INT NOT NULL DEFAULT 100 AFTER `required_score`,
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true AFTER `required_completion_rate`;
