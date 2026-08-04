UPDATE `training_positions`
SET
  `name_zh` = '厨房',
  `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'BOH'
  AND `name_zh` = '后厨';
