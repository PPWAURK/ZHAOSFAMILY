-- AlterTable
ALTER TABLE `exam_attempts` ADD COLUMN `session_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `exam_templates` ADD COLUMN `access_mode` VARCHAR(10) NOT NULL DEFAULT 'LIST';

-- CreateTable
CREATE TABLE `exam_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(6) NOT NULL,
    `active_code` VARCHAR(6) NULL,
    `template_id` INTEGER NOT NULL,
    `label` VARCHAR(100) NULL,
    `examiner_user_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `opened_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `locked_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exam_sessions_active_code_key`(`active_code`),
    INDEX `exam_sessions_examiner_user_id_created_at_idx`(`examiner_user_id`, `created_at`),
    INDEX `exam_sessions_status_ends_at_idx`(`status`, `ends_at`),
    INDEX `exam_sessions_template_id_idx`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `exam_attempts_session_id_user_id_key` ON `exam_attempts`(`session_id`, `user_id`);

-- AddForeignKey
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_sessions` ADD CONSTRAINT `exam_sessions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `exam_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_sessions` ADD CONSTRAINT `exam_sessions_examiner_user_id_fkey` FOREIGN KEY (`examiner_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Session management permission, the examiner role, and grants.
INSERT INTO `permissions` (`key`, `description`, `updated_at`) VALUES
  ('exam.session.manage', 'Open proctored exam sessions and follow their participants', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP(3);

INSERT INTO `roles` (`name`, `description`, `updated_at`) VALUES
  ('examiner', 'Opens exam sessions with a join code and follows them live', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP(3);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
JOIN `permissions` ON `permissions`.`key` = 'exam.session.manage'
WHERE `roles`.`name` IN ('super-admin', 'training-admin', 'examiner');
