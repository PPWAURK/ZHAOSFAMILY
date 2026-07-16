ALTER TABLE `abc_score_media`
  DROP COLUMN `department`;

ALTER TABLE `abc_store_scores`
  ADD COLUMN `inspection_notes` TEXT NULL AFTER `grade`,
  ADD COLUMN `inspected_by_user_id` INT NULL AFTER `inspection_notes`,
  ADD COLUMN `inspected_at` DATETIME(3) NULL AFTER `inspected_by_user_id`;

UPDATE `abc_store_scores`
SET
  `inspection_notes` = `operations_notes`,
  `inspected_by_user_id` = `operations_filled_by_user_id`,
  `inspected_at` = `operations_filled_at`
WHERE `operations_notes` IS NOT NULL
   OR `operations_filled_by_user_id` IS NOT NULL
   OR `operations_filled_at` IS NOT NULL;

ALTER TABLE `abc_store_scores`
  DROP COLUMN `marketing_score`,
  DROP COLUMN `marketing_notes`,
  DROP COLUMN `marketing_filled_by_user_id`,
  DROP COLUMN `marketing_filled_at`,
  DROP COLUMN `operations_score`,
  DROP COLUMN `operations_notes`,
  DROP COLUMN `operations_filled_by_user_id`,
  DROP COLUMN `operations_filled_at`;
