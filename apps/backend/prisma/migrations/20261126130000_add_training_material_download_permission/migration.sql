INSERT INTO `permissions` (`key`, `description`, `updated_at`)
SELECT 'training.material.download', 'Download original training material files', NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `permissions` WHERE `key` = 'training.material.download'
);

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
JOIN `permissions` p ON p.`key` = 'training.material.download'
WHERE r.`name` = 'super-admin'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`permission_id` = p.`id`
  );
