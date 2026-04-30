CREATE TABLE `training_positions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name_zh` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NOT NULL,
  `name_fr` VARCHAR(100) NOT NULL,
  `parent_code` VARCHAR(40) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `training_positions_code_key`(`code`),
  INDEX `training_positions_parent_code_idx`(`parent_code`),
  INDEX `training_positions_is_active_sort_order_idx`(`is_active`, `sort_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `training_materials`
  MODIFY `position_id` VARCHAR(40) NOT NULL;

INSERT INTO `training_positions`
  (`code`, `name_zh`, `name_en`, `name_fr`, `parent_code`, `is_active`, `sort_order`, `updated_at`)
VALUES
  ('ALL', '全岗通用', 'All positions', 'Tous les postes', NULL, true, 0, CURRENT_TIMESTAMP(3)),
  ('FOH', '前厅', 'Front of House', 'Salle', NULL, true, 10, CURRENT_TIMESTAMP(3)),
  ('BOH', '后厨', 'Back of House', 'Cuisine', NULL, true, 20, CURRENT_TIMESTAMP(3)),
  ('CASH', '收银', 'Cashier', 'Caisse', NULL, true, 30, CURRENT_TIMESTAMP(3)),
  ('SM', '店长', 'Store Manager', 'Responsable boutique', NULL, true, 40, CURRENT_TIMESTAMP(3)),
  ('RM', '区域经理', 'Regional Manager', 'Responsable régional', NULL, true, 50, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `name_zh` = VALUES(`name_zh`),
  `name_en` = VALUES(`name_en`),
  `name_fr` = VALUES(`name_fr`),
  `parent_code` = VALUES(`parent_code`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = CURRENT_TIMESTAMP(3);

INSERT INTO `permissions` (`key`, `description`, `updated_at`) VALUES
  ('training.position.manage', 'Manage training positions', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP(3);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
JOIN `permissions` ON `permissions`.`key` = 'training.position.manage'
WHERE `roles`.`name` IN ('super-admin', 'training-admin');
