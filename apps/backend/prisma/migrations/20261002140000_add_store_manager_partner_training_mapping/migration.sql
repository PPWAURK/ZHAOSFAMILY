INSERT INTO `training_job_role_positions`
  (`job_role`, `position_code`, `include_descendants`, `grants_all_positions`, `created_at`, `updated_at`)
VALUES
  (
    'STORE_MANAGER_PARTNER',
    'STORE_MANAGER_PARTNER',
    false,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  `position_code` = VALUES(`position_code`),
  `include_descendants` = VALUES(`include_descendants`),
  `grants_all_positions` = VALUES(`grants_all_positions`),
  `updated_at` = CURRENT_TIMESTAMP(3);
