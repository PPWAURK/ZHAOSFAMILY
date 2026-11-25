-- Exam categories: seed the 11 categories of the 店长科目一 paper and backfill
-- the category of questions generated before their material had one.
-- The columns (exam_categories, exam_questions.category_id,
-- exam_knowledge_materials.category_id) already exist; this is data only.
-- Idempotent: safe to run on a database that already has some categories.

-- 1. Categories. INSERT IGNORE keeps names an admin already edited.
INSERT IGNORE INTO `exam_categories`
  (`code`, `name_zh`, `name_fr`, `sort_order`, `is_active`, `updated_at`) VALUES
  ('culture',    '企业文化',       'Culture d''entreprise',   10, 1, CURRENT_TIMESTAMP(3)),
  ('management', '店长管理',       'Gestion du magasin',      20, 1, CURRENT_TIMESTAMP(3)),
  ('tools',      '系统工具',       'Outils',                  30, 1, CURRENT_TIMESTAMP(3)),
  ('hr',         '人事管理',       'Ressources humaines',     40, 1, CURRENT_TIMESTAMP(3)),
  ('talent',     '人才培养与激励', 'Formation et motivation', 50, 1, CURRENT_TIMESTAMP(3)),
  ('levers',     '六大抓手',       'Six leviers',             60, 1, CURRENT_TIMESTAMP(3)),
  ('operations', '门店运营',       'Opérations',              70, 1, CURRENT_TIMESTAMP(3)),
  ('roles',      '岗位流程',       'Procédures de poste',     80, 1, CURRENT_TIMESTAMP(3)),
  ('kitchen',    '厨房标准',       'Normes cuisine',          90, 1, CURRENT_TIMESTAMP(3)),
  ('hygiene',    '卫生与设备',     'Hygiène et équipements', 100, 1, CURRENT_TIMESTAMP(3)),
  ('storage',    '采购与仓储',     'Achats et stockage',     110, 1, CURRENT_TIMESTAMP(3));

-- 2. Backfill journal: what the backfill changed, so it can be rolled back.
-- Drop it with the statement in rollback.sql once the result is verified.
CREATE TABLE `exam_question_category_backfill` (
  `question_id` INTEGER NOT NULL,
  `old_category_id` INTEGER NULL,
  `new_category_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`question_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Backfill: an AI question takes the category of the material it came from.
-- Hand-written questions (origin MANUAL) are never touched. Questions without
-- a source material, or whose material has no category, keep their value
-- (NULL = 未分类) and are listed by verify.sql.
INSERT INTO `exam_question_category_backfill` (`question_id`, `old_category_id`, `new_category_id`)
SELECT `q`.`id`, `q`.`category_id`, `m`.`category_id`
FROM `exam_questions` `q`
JOIN `exam_knowledge_materials` `m` ON `m`.`id` = `q`.`source_material_id`
WHERE `q`.`origin` = 'AI'
  AND `m`.`category_id` IS NOT NULL
  AND (`q`.`category_id` IS NULL OR `q`.`category_id` <> `m`.`category_id`);

UPDATE `exam_questions` `q`
JOIN `exam_question_category_backfill` `b` ON `b`.`question_id` = `q`.`id`
SET `q`.`category_id` = `b`.`new_category_id`;
