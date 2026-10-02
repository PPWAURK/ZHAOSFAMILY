INSERT INTO `roles` (`name`, `description`, `updated_at`) VALUES
  (
    'store-manager-partner',
    'Read-only store operations access for store manager partners',
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP(3);

INSERT INTO `permissions` (`key`, `description`, `updated_at`) VALUES
  (
    'training.material.read',
    'Read training material metadata',
    CURRENT_TIMESTAMP(3)
  ),
  (
    'training.material.play',
    'Open and play training materials',
    CURRENT_TIMESTAMP(3)
  ),
  (
    'training.progress.view_store',
    'View store training progress',
    CURRENT_TIMESTAMP(3)
  ),
  (
    'abc.inspection.read',
    'View ABC inspection cycles and grade results',
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP(3);

DELETE `role_permissions`
FROM `role_permissions`
JOIN `roles` ON `roles`.`id` = `role_permissions`.`role_id`
WHERE `roles`.`name` = 'store-manager-partner';

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
JOIN `permissions` ON `permissions`.`key` IN (
  'training.material.read',
  'training.material.play',
  'training.progress.view_store',
  'abc.inspection.read'
)
WHERE `roles`.`name` = 'store-manager-partner';
