-- Difficulty becomes the 记忆 / 理解 / 情景 scale.
UPDATE `exam_questions`
  SET `difficulty` = CASE `difficulty`
    WHEN 'easy' THEN 'recall'
    WHEN 'hard' THEN 'scenario'
    ELSE 'understand'
  END;
ALTER TABLE `exam_questions`
  ALTER COLUMN `difficulty` SET DEFAULT 'understand',
  ADD COLUMN `knowledge_point` VARCHAR(100) NULL;

UPDATE `exam_templates`
  SET `difficulties` = CAST(
    REPLACE(REPLACE(REPLACE(CAST(`difficulties` AS CHAR),
      '"easy"', '"recall"'), '"medium"', '"understand"'), '"hard"', '"scenario"')
    AS JSON)
  WHERE `difficulties` IS NOT NULL;

-- Material category and bank targets per difficulty.
ALTER TABLE `exam_knowledge_materials`
  ADD COLUMN `category_id` INTEGER NULL,
  ADD COLUMN `target_recall` INTEGER NULL,
  ADD COLUMN `target_understand` INTEGER NULL,
  ADD COLUMN `target_scenario` INTEGER NULL;
ALTER TABLE `exam_knowledge_materials` ADD CONSTRAINT `exam_knowledge_materials_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `exam_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Sectioned papers.
ALTER TABLE `exam_templates` ADD COLUMN `blueprint` JSON NULL;
ALTER TABLE `exam_attempts`
  ADD COLUMN `section_index` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `break_ends_at` DATETIME(3) NULL,
  ADD COLUMN `rule_results` JSON NULL,
  ADD COLUMN `layout` JSON NULL;

-- Target-driven generation.
ALTER TABLE `exam_generation_jobs` ADD COLUMN `mode` VARCHAR(10) NOT NULL DEFAULT 'COUNT';
ALTER TABLE `exam_generation_requests` ADD COLUMN `difficulty` VARCHAR(10) NULL;
