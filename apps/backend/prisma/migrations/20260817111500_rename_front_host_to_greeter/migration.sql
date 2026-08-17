-- This follow-up migration applies the display-name correction to databases
-- where the position restructuring migration has already run.
UPDATE `training_positions`
SET
  `name_zh` = '迎宾',
  `name_en` = 'Host',
  `name_fr` = 'Accueil',
  `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'FRONT_HOST';
