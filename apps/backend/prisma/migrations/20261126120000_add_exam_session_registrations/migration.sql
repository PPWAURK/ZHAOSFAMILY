-- AlterTable
ALTER TABLE `exam_sessions` ADD COLUMN `require_registration` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `exam_session_registrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `notified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `exam_session_registrations_session_id_user_id_key`(`session_id`, `user_id`),
    INDEX `exam_session_registrations_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exam_session_registrations` ADD CONSTRAINT `exam_session_registrations_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_session_registrations` ADD CONSTRAINT `exam_session_registrations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_session_registrations` ADD CONSTRAINT `exam_session_registrations_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
