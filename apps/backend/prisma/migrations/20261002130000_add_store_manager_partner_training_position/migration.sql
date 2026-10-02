INSERT INTO `training_positions`
  (`code`, `name_zh`, `name_en`, `name_fr`, `parent_code`, `is_active`, `sort_order`, `updated_at`)
VALUES
  (
    'STORE_MANAGER_PARTNER',
    '店长合伙人',
    'Store Manager Partner',
    'Associé gérant de magasin',
    NULL,
    true,
    45,
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  `name_zh` = VALUES(`name_zh`),
  `name_en` = VALUES(`name_en`),
  `name_fr` = VALUES(`name_fr`),
  `parent_code` = VALUES(`parent_code`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = CURRENT_TIMESTAMP(3);
