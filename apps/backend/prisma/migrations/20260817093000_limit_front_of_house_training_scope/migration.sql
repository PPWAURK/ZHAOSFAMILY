UPDATE `training_job_role_positions`
SET `include_descendants` = false,
    `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `job_role` = 'front-of-house';

INSERT INTO `training_positions`
  (`code`, `name_zh`, `name_en`, `name_fr`, `parent_code`, `is_active`, `sort_order`, `updated_at`)
VALUES
  ('FRONT_MANAGER', '前厅经理', 'Front Manager', 'Responsable salle', 'FOH', true, 16, CURRENT_TIMESTAMP(3)),
  ('FRONT_ASSISTANT', '前厅助理', 'Front Assistant', 'Assistant salle', 'FOH', true, 17, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `name_zh` = VALUES(`name_zh`),
  `name_en` = VALUES(`name_en`),
  `name_fr` = VALUES(`name_fr`),
  `parent_code` = VALUES(`parent_code`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = CURRENT_TIMESTAMP(3);

UPDATE `training_job_role_positions`
SET `position_code` = 'FRONT_MANAGER',
    `include_descendants` = false,
    `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `job_role` = 'front-manager';

UPDATE `training_job_role_positions`
SET `position_code` = 'FRONT_ASSISTANT',
    `include_descendants` = false,
    `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `job_role` = 'front-assistant';
