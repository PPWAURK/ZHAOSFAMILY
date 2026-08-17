-- Keep existing training materials and progress intact by moving their position
-- codes before the legacy nodes are hidden.
UPDATE `training_materials`
SET `position_id` = CASE `position_id`
  WHEN 'FOH' THEN 'FRONT_OF_HOUSE'
  WHEN 'BOH' THEN 'KITCHEN'
  WHEN 'CASH' THEN 'FRONT_CASHIER'
  WHEN 'FRONT_PACKER' THEN 'FRONT_PACKING'
  WHEN 'BACK_DISHWASHER' THEN 'KITCHEN_DISHWASHING'
  WHEN 'BACK_NOODLE' THEN 'KITCHEN_NOODLE_STATION'
  WHEN 'BACK_HOT_APPETIZER' THEN 'KITCHEN_HOT_APPETIZERS'
  WHEN 'BACK_COLD_APPETIZER' THEN 'KITCHEN_COLD_APPETIZERS'
  WHEN 'BACK_RICE' THEN 'KITCHEN_RICE'
  ELSE `position_id`
END
WHERE `position_id` IN (
  'FOH', 'BOH', 'CASH', 'FRONT_PACKER', 'BACK_DISHWASHER',
  'BACK_NOODLE', 'BACK_HOT_APPETIZER', 'BACK_COLD_APPETIZER', 'BACK_RICE'
);

UPDATE `training_positions`
SET `code` = CASE `code`
  WHEN 'FOH' THEN 'FRONT_OF_HOUSE'
  WHEN 'BOH' THEN 'KITCHEN'
  WHEN 'FRONT_PACKER' THEN 'FRONT_PACKING'
  WHEN 'BACK_DISHWASHER' THEN 'KITCHEN_DISHWASHING'
  WHEN 'BACK_NOODLE' THEN 'KITCHEN_NOODLE_STATION'
  WHEN 'BACK_HOT_APPETIZER' THEN 'KITCHEN_HOT_APPETIZERS'
  WHEN 'BACK_COLD_APPETIZER' THEN 'KITCHEN_COLD_APPETIZERS'
  WHEN 'BACK_RICE' THEN 'KITCHEN_RICE'
  ELSE `code`
END
WHERE `code` IN (
  'FOH', 'BOH', 'FRONT_PACKER', 'BACK_DISHWASHER',
  'BACK_NOODLE', 'BACK_HOT_APPETIZER', 'BACK_COLD_APPETIZER', 'BACK_RICE'
);

UPDATE `training_job_role_positions`
SET `position_code` = CASE `position_code`
  WHEN 'FOH' THEN 'FRONT_OF_HOUSE'
  WHEN 'BOH' THEN 'KITCHEN'
  WHEN 'FRONT_PACKER' THEN 'FRONT_PACKING'
  WHEN 'BACK_DISHWASHER' THEN 'KITCHEN_DISHWASHING'
  WHEN 'BACK_NOODLE' THEN 'KITCHEN_NOODLE_STATION'
  WHEN 'BACK_HOT_APPETIZER' THEN 'KITCHEN_HOT_APPETIZERS'
  WHEN 'BACK_COLD_APPETIZER' THEN 'KITCHEN_COLD_APPETIZERS'
  WHEN 'BACK_RICE' THEN 'KITCHEN_RICE'
  ELSE `position_code`
END
WHERE `position_code` IN (
  'FOH', 'BOH', 'FRONT_PACKER', 'BACK_DISHWASHER',
  'BACK_NOODLE', 'BACK_HOT_APPETIZER', 'BACK_COLD_APPETIZER', 'BACK_RICE'
);

-- Users invited with a position code (rather than a legacy job-role slug) keep
-- their learning scope after the canonical code changes.
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'FRONT_PACKER', 'FRONT_PACKING')
WHERE `job_role` LIKE '%FRONT_PACKER%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'BACK_DISHWASHER', 'KITCHEN_DISHWASHING')
WHERE `job_role` LIKE '%BACK_DISHWASHER%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'BACK_NOODLE', 'KITCHEN_NOODLE_STATION')
WHERE `job_role` LIKE '%BACK_NOODLE%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'BACK_HOT_APPETIZER', 'KITCHEN_HOT_APPETIZERS')
WHERE `job_role` LIKE '%BACK_HOT_APPETIZER%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'BACK_COLD_APPETIZER', 'KITCHEN_COLD_APPETIZERS')
WHERE `job_role` LIKE '%BACK_COLD_APPETIZER%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'BACK_RICE', 'KITCHEN_RICE')
WHERE `job_role` LIKE '%BACK_RICE%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'BOH', 'KITCHEN')
WHERE `job_role` LIKE '%BOH%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'FOH', 'FRONT_OF_HOUSE')
WHERE `job_role` LIKE '%FOH%';
UPDATE `users` SET `job_role` = REPLACE(`job_role`, 'CASH', 'FRONT_CASHIER')
WHERE `job_role` = 'CASH';

INSERT INTO `training_positions`
  (`code`, `name_zh`, `name_en`, `name_fr`, `parent_code`, `is_active`, `sort_order`, `updated_at`)
VALUES
  ('KITCHEN_MANAGER', '厨房经理', 'Kitchen Manager', 'Cuisine Manager', 'KITCHEN', true, 21, CURRENT_TIMESTAMP(3)),
  ('KITCHEN_ASSISTANT', '厨房助理', 'Kitchen Assistant', 'Assistant cuisine', 'KITCHEN_MANAGER', true, 22, CURRENT_TIMESTAMP(3)),
  ('FRONT_VERSATILE', '前厅通岗员工', 'Front-of-house versatile employee', 'Salle polyvalent', 'FRONT_ASSISTANT', true, 26, CURRENT_TIMESTAMP(3)),
  ('KITCHEN_PREPARATION', '备料', 'Preparation', 'Préparation', 'KITCHEN_ASSISTANT', true, 26, CURRENT_TIMESTAMP(3)),
  ('KITCHEN_VERSATILE', '厨房通岗', 'Kitchen versatile employee', 'Polyvalent cuisine', 'KITCHEN_ASSISTANT', true, 27, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `name_zh` = VALUES(`name_zh`),
  `name_en` = VALUES(`name_en`),
  `name_fr` = VALUES(`name_fr`),
  `parent_code` = VALUES(`parent_code`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = CURRENT_TIMESTAMP(3);

UPDATE `training_positions`
SET
  `name_zh` = CASE `code`
    WHEN 'FRONT_OF_HOUSE' THEN '前厅'
    WHEN 'KITCHEN' THEN '厨房'
    WHEN 'FRONT_MANAGER' THEN '前厅经理'
    WHEN 'FRONT_ASSISTANT' THEN '前厅助理'
    WHEN 'FRONT_HOST' THEN '迎宾'
    WHEN 'FRONT_CASHIER' THEN '收银'
    WHEN 'FRONT_PACKING' THEN '打包'
    WHEN 'FRONT_VERSATILE' THEN '前厅通岗员工'
    WHEN 'FRONT_SERVER' THEN '服务员'
    WHEN 'FRONT_BAR' THEN '吧台'
    WHEN 'KITCHEN_MANAGER' THEN '厨房经理'
    WHEN 'KITCHEN_ASSISTANT' THEN '厨房助理'
    WHEN 'KITCHEN_RICE' THEN '饭区'
    WHEN 'KITCHEN_DISHWASHING' THEN '洗碗'
    WHEN 'KITCHEN_PREPARATION' THEN '备料'
    WHEN 'KITCHEN_VERSATILE' THEN '厨房通岗'
    WHEN 'KITCHEN_NOODLE_STATION' THEN '面区'
    WHEN 'KITCHEN_HOT_APPETIZERS' THEN '热前菜'
    WHEN 'KITCHEN_COLD_APPETIZERS' THEN '冷前菜'
    ELSE `name_zh`
  END,
  `name_en` = CASE `code`
    WHEN 'FRONT_OF_HOUSE' THEN 'Front of House'
    WHEN 'KITCHEN' THEN 'Kitchen'
    WHEN 'FRONT_MANAGER' THEN 'Front Manager'
    WHEN 'FRONT_ASSISTANT' THEN 'Front Assistant'
    WHEN 'FRONT_HOST' THEN 'Host'
    WHEN 'FRONT_CASHIER' THEN 'Cashier'
    WHEN 'FRONT_PACKING' THEN 'Packing'
    WHEN 'FRONT_SERVER' THEN 'Server'
    WHEN 'FRONT_BAR' THEN 'Bar'
    WHEN 'KITCHEN_MANAGER' THEN 'Kitchen Manager'
    WHEN 'KITCHEN_ASSISTANT' THEN 'Kitchen Assistant'
    WHEN 'KITCHEN_RICE' THEN 'Rice station'
    WHEN 'KITCHEN_DISHWASHING' THEN 'Dishwashing'
    WHEN 'KITCHEN_NOODLE_STATION' THEN 'Noodle station'
    WHEN 'KITCHEN_HOT_APPETIZERS' THEN 'Hot appetizers'
    WHEN 'KITCHEN_COLD_APPETIZERS' THEN 'Cold appetizers'
    ELSE `name_en`
  END,
  `name_fr` = CASE `code`
    WHEN 'FRONT_OF_HOUSE' THEN 'Salle'
    WHEN 'KITCHEN' THEN 'Cuisine'
    WHEN 'FRONT_MANAGER' THEN 'Salle Manager'
    WHEN 'FRONT_ASSISTANT' THEN 'Assistant salle'
    WHEN 'FRONT_HOST' THEN 'Accueil'
    WHEN 'FRONT_CASHIER' THEN 'Caisse'
    WHEN 'FRONT_PACKING' THEN 'Retrait'
    WHEN 'FRONT_SERVER' THEN 'Serveur'
    WHEN 'FRONT_BAR' THEN 'Bar'
    WHEN 'KITCHEN_MANAGER' THEN 'Cuisine Manager'
    WHEN 'KITCHEN_ASSISTANT' THEN 'Assistant cuisine'
    WHEN 'KITCHEN_RICE' THEN 'Riz'
    WHEN 'KITCHEN_DISHWASHING' THEN 'Plonge'
    WHEN 'KITCHEN_NOODLE_STATION' THEN 'Pâte'
    WHEN 'KITCHEN_HOT_APPETIZERS' THEN 'Entrées chaudes'
    WHEN 'KITCHEN_COLD_APPETIZERS' THEN 'Entrées froides'
    ELSE `name_fr`
  END,
  `parent_code` = CASE `code`
    WHEN 'FRONT_MANAGER' THEN 'FRONT_OF_HOUSE'
    WHEN 'FRONT_ASSISTANT' THEN 'FRONT_MANAGER'
    WHEN 'FRONT_HOST' THEN 'FRONT_ASSISTANT'
    WHEN 'FRONT_CASHIER' THEN 'FRONT_ASSISTANT'
    WHEN 'FRONT_PACKING' THEN 'FRONT_ASSISTANT'
    WHEN 'FRONT_SERVER' THEN 'FRONT_ASSISTANT'
    WHEN 'FRONT_BAR' THEN 'FRONT_ASSISTANT'
    WHEN 'KITCHEN_MANAGER' THEN 'KITCHEN'
    WHEN 'KITCHEN_ASSISTANT' THEN 'KITCHEN_MANAGER'
    WHEN 'KITCHEN_RICE' THEN 'KITCHEN_ASSISTANT'
    WHEN 'KITCHEN_DISHWASHING' THEN 'KITCHEN_ASSISTANT'
    WHEN 'KITCHEN_NOODLE_STATION' THEN 'KITCHEN_ASSISTANT'
    WHEN 'KITCHEN_HOT_APPETIZERS' THEN 'KITCHEN_ASSISTANT'
    WHEN 'KITCHEN_COLD_APPETIZERS' THEN 'KITCHEN_ASSISTANT'
    ELSE `parent_code`
  END,
  `sort_order` = CASE `code`
    WHEN 'FRONT_OF_HOUSE' THEN 10
    WHEN 'FRONT_MANAGER' THEN 11
    WHEN 'FRONT_ASSISTANT' THEN 12
    WHEN 'FRONT_HOST' THEN 21
    WHEN 'FRONT_CASHIER' THEN 22
    WHEN 'FRONT_PACKING' THEN 23
    WHEN 'FRONT_VERSATILE' THEN 24
    WHEN 'FRONT_SERVER' THEN 25
    WHEN 'FRONT_BAR' THEN 26
    WHEN 'KITCHEN' THEN 30
    WHEN 'KITCHEN_MANAGER' THEN 31
    WHEN 'KITCHEN_ASSISTANT' THEN 32
    WHEN 'KITCHEN_RICE' THEN 41
    WHEN 'KITCHEN_DISHWASHING' THEN 42
    WHEN 'KITCHEN_PREPARATION' THEN 43
    WHEN 'KITCHEN_VERSATILE' THEN 44
    WHEN 'KITCHEN_NOODLE_STATION' THEN 45
    WHEN 'KITCHEN_HOT_APPETIZERS' THEN 46
    WHEN 'KITCHEN_COLD_APPETIZERS' THEN 47
    ELSE `sort_order`
  END,
  `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `code` IN (
  'FRONT_OF_HOUSE', 'FRONT_MANAGER', 'FRONT_ASSISTANT', 'FRONT_HOST',
  'FRONT_CASHIER', 'FRONT_PACKING', 'FRONT_VERSATILE', 'FRONT_SERVER',
  'FRONT_BAR', 'KITCHEN', 'KITCHEN_MANAGER', 'KITCHEN_ASSISTANT',
  'KITCHEN_RICE', 'KITCHEN_DISHWASHING', 'KITCHEN_PREPARATION',
  'KITCHEN_VERSATILE', 'KITCHEN_NOODLE_STATION',
  'KITCHEN_HOT_APPETIZERS', 'KITCHEN_COLD_APPETIZERS'
);

UPDATE `training_positions`
SET `parent_code` = CASE `parent_code`
  WHEN 'FOH' THEN 'FRONT_OF_HOUSE'
  WHEN 'BOH' THEN 'KITCHEN'
  ELSE `parent_code`
END,
`updated_at` = CURRENT_TIMESTAMP(3)
WHERE `parent_code` IN ('FOH', 'BOH');

UPDATE `training_job_role_positions`
SET
  `position_code` = CASE `job_role`
    WHEN 'front-manager' THEN 'FRONT_MANAGER'
    WHEN 'front-assistant' THEN 'FRONT_ASSISTANT'
    WHEN 'back-manager' THEN 'KITCHEN_MANAGER'
    WHEN 'back-assistant' THEN 'KITCHEN_ASSISTANT'
    WHEN 'front-of-house' THEN 'FRONT_OF_HOUSE'
    WHEN 'back-of-house' THEN 'KITCHEN'
    ELSE `position_code`
  END,
  `include_descendants` = CASE
    WHEN `job_role` IN (
      'front-manager', 'front-assistant', 'back-manager', 'back-assistant',
      'front-of-house', 'back-of-house'
    ) THEN true
    ELSE `include_descendants`
  END,
  `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `job_role` IN (
  'front-manager', 'front-assistant', 'back-manager', 'back-assistant',
  'front-of-house', 'back-of-house'
);

-- CASH was a duplicate root. Its materials already moved to FRONT_CASHIER;
-- retain the row only as inactive historical metadata.
UPDATE `training_positions`
SET `is_active` = false, `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'CASH';
