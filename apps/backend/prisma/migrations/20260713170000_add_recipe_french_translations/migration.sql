ALTER TABLE `recipes`
  ADD COLUMN `name_fr` VARCHAR(255) NULL,
  ADD COLUMN `category_fr` VARCHAR(80) NULL;

ALTER TABLE `recipe_ingredients`
  ADD COLUMN `name_fr` VARCHAR(255) NULL,
  ADD COLUMN `unit_fr` VARCHAR(30) NULL;

ALTER TABLE `recipe_steps`
  ADD COLUMN `instruction_fr` TEXT NULL;
