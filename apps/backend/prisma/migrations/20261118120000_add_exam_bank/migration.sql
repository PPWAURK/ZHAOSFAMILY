-- CreateTable
CREATE TABLE `exam_knowledge_materials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `bucket` VARCHAR(100) NOT NULL,
    `object_key` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(120) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `language` VARCHAR(10) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `error_code` VARCHAR(60) NULL,
    `char_count` INTEGER NOT NULL DEFAULT 0,
    `chunk_count` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `uploaded_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exam_knowledge_materials_object_key_key`(`object_key`),
    INDEX `exam_knowledge_materials_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_knowledge_chunks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `token_estimate` INTEGER NOT NULL,
    `embedding` BLOB NULL,
    `embedding_model` VARCHAR(40) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `exam_knowledge_chunks_material_id_ordinal_key`(`material_id`, `ordinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `name_zh` VARCHAR(100) NOT NULL,
    `name_fr` VARCHAR(100) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exam_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `origin` VARCHAR(10) NOT NULL DEFAULT 'AI',
    `difficulty` VARCHAR(10) NOT NULL DEFAULT 'medium',
    `category_id` INTEGER NULL,
    `prompt_zh` VARCHAR(1000) NOT NULL,
    `prompt_fr` VARCHAR(1000) NOT NULL,
    `options` JSON NOT NULL,
    `correct_keys` JSON NOT NULL,
    `explanation_zh` TEXT NULL,
    `explanation_fr` TEXT NULL,
    `evidence` VARCHAR(1000) NULL,
    `prompt_embedding` BLOB NULL,
    `embedding_model` VARCHAR(40) NULL,
    `source_material_id` INTEGER NULL,
    `source_chunk_id` INTEGER NULL,
    `generation_job_id` INTEGER NULL,
    `reviewed_by_user_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reject_reason` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `exam_questions_status_type_idx`(`status`, `type`),
    INDEX `exam_questions_status_category_id_idx`(`status`, `category_id`),
    INDEX `exam_questions_source_material_id_idx`(`source_material_id`),
    INDEX `exam_questions_source_chunk_id_idx`(`source_chunk_id`),
    INDEX `exam_questions_generation_job_id_idx`(`generation_job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_generation_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    `requested_count` INTEGER NOT NULL,
    `planned_count` INTEGER NOT NULL,
    `material_ids` JSON NOT NULL,
    `type_mix` JSON NOT NULL,
    `model` VARCHAR(60) NOT NULL,
    `effort` VARCHAR(10) NOT NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `current_batch_id` VARCHAR(100) NULL,
    `total_requests` INTEGER NOT NULL DEFAULT 0,
    `succeeded_requests` INTEGER NOT NULL DEFAULT 0,
    `failed_requests` INTEGER NOT NULL DEFAULT 0,
    `generated_count` INTEGER NOT NULL DEFAULT 0,
    `kept_count` INTEGER NOT NULL DEFAULT 0,
    `duplicate_count` INTEGER NOT NULL DEFAULT 0,
    `invalid_count` INTEGER NOT NULL DEFAULT 0,
    `input_tokens` INTEGER NOT NULL DEFAULT 0,
    `output_tokens` INTEGER NOT NULL DEFAULT 0,
    `error_code` VARCHAR(60) NULL,
    `error_message` VARCHAR(500) NULL,
    `locked_until` DATETIME(3) NULL,
    `created_by_user_id` INTEGER NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `exam_generation_jobs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_generation_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_id` INTEGER NOT NULL,
    `chunk_id` INTEGER NOT NULL,
    `round` INTEGER NOT NULL,
    `quota` JSON NOT NULL,
    `variant` INTEGER NOT NULL DEFAULT 0,
    `variant_count` INTEGER NOT NULL DEFAULT 1,
    `custom_id` VARCHAR(64) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attempt` INTEGER NOT NULL DEFAULT 1,
    `batch_id` VARCHAR(100) NULL,
    `error_type` VARCHAR(60) NULL,
    `produced_count` INTEGER NOT NULL DEFAULT 0,
    `kept_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exam_generation_requests_custom_id_key`(`custom_id`),
    INDEX `exam_generation_requests_job_id_status_idx`(`job_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title_zh` VARCHAR(200) NOT NULL,
    `title_fr` VARCHAR(200) NOT NULL,
    `description_zh` TEXT NULL,
    `description_fr` TEXT NULL,
    `single_count` INTEGER NOT NULL DEFAULT 0,
    `multiple_count` INTEGER NOT NULL DEFAULT 0,
    `boolean_count` INTEGER NOT NULL DEFAULT 0,
    `category_ids` JSON NULL,
    `material_ids` JSON NULL,
    `difficulties` JSON NULL,
    `time_limit_minutes` INTEGER NULL,
    `passing_score` INTEGER NOT NULL DEFAULT 80,
    `max_attempts` INTEGER NULL,
    `shuffle_options` BOOLEAN NOT NULL DEFAULT true,
    `show_explanations` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `exam_templates_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `restaurant_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    `active_key` VARCHAR(40) NULL,
    `question_ids` JSON NOT NULL,
    `snapshot` JSON NOT NULL,
    `answers` JSON NULL,
    `results` JSON NULL,
    `total_count` INTEGER NOT NULL,
    `correct_count` INTEGER NULL,
    `score` INTEGER NULL,
    `passed` BOOLEAN NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deadline_at` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,

    UNIQUE INDEX `exam_attempts_active_key_key`(`active_key`),
    INDEX `exam_attempts_user_id_template_id_idx`(`user_id`, `template_id`),
    INDEX `exam_attempts_template_id_submitted_at_idx`(`template_id`, `submitted_at`),
    INDEX `exam_attempts_restaurant_id_submitted_at_idx`(`restaurant_id`, `submitted_at`),
    INDEX `exam_attempts_status_deadline_at_idx`(`status`, `deadline_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exam_knowledge_chunks` ADD CONSTRAINT `exam_knowledge_chunks_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `exam_knowledge_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `exam_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_source_material_id_fkey` FOREIGN KEY (`source_material_id`) REFERENCES `exam_knowledge_materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_source_chunk_id_fkey` FOREIGN KEY (`source_chunk_id`) REFERENCES `exam_knowledge_chunks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_generation_job_id_fkey` FOREIGN KEY (`generation_job_id`) REFERENCES `exam_generation_jobs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_generation_requests` ADD CONSTRAINT `exam_generation_requests_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `exam_generation_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `exam_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Seed exam bank permissions (idempotent) and grant them to admin roles.
INSERT INTO `permissions` (`key`, `description`, `updated_at`) VALUES
  ('exam.bank.manage', 'Manage the exam knowledge base, question bank and exam templates', CURRENT_TIMESTAMP(3)),
  ('exam.result.view', 'View and export exam results of all employees', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP(3);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
JOIN `permissions` ON `permissions`.`key` IN ('exam.bank.manage', 'exam.result.view')
WHERE `roles`.`name` IN ('super-admin', 'training-admin');
