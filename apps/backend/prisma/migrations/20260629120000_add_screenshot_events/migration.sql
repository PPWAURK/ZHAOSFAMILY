-- CreateTable
CREATE TABLE `screen_security_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `event_type` VARCHAR(20) NOT NULL DEFAULT 'screenshot',
    `screen_name` VARCHAR(100) NULL,
    `device_info` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `screen_security_events_user_id_idx`(`user_id`),
    INDEX `screen_security_events_event_type_idx`(`event_type`),
    INDEX `screen_security_events_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `screen_security_events` ADD CONSTRAINT `screen_security_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
