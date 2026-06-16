-- CreateTable
CREATE TABLE `training_quizzes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `material_id` INTEGER NOT NULL,
  `passing_score` INTEGER NOT NULL DEFAULT 80,
  `max_attempts` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `training_quizzes_material_id_key`(`material_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_quiz_questions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `quiz_id` INTEGER NOT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'single',
  `prompt` VARCHAR(500) NOT NULL,
  `options` JSON NOT NULL,
  `correct_keys` JSON NOT NULL,
  `explanation` VARCHAR(500) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `training_quiz_questions_quiz_id_idx`(`quiz_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_quiz_attempts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `quiz_id` INTEGER NOT NULL,
  `score` INTEGER NOT NULL,
  `passed` BOOLEAN NOT NULL DEFAULT false,
  `answers` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `training_quiz_attempts_user_id_quiz_id_idx`(`user_id`, `quiz_id`),
  INDEX `training_quiz_attempts_quiz_id_idx`(`quiz_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_titles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name_zh` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NOT NULL,
  `name_fr` VARCHAR(100) NOT NULL,
  `frame_style` VARCHAR(40) NOT NULL DEFAULT 'red',
  `unlock_position_code` VARCHAR(40) NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `training_titles_code_key`(`code`),
  INDEX `training_titles_unlock_position_code_idx`(`unlock_position_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_training_titles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `title_code` VARCHAR(40) NOT NULL,
  `earned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `user_training_titles_user_id_idx`(`user_id`),
  UNIQUE INDEX `user_training_titles_user_id_title_code_key`(`user_id`, `title_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `training_quizzes` ADD CONSTRAINT `training_quizzes_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `training_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_quiz_questions` ADD CONSTRAINT `training_quiz_questions_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `training_quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_quiz_attempts` ADD CONSTRAINT `training_quiz_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_quiz_attempts` ADD CONSTRAINT `training_quiz_attempts_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `training_quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_training_titles` ADD CONSTRAINT `user_training_titles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_training_titles` ADD CONSTRAINT `user_training_titles_title_code_fkey` FOREIGN KEY (`title_code`) REFERENCES `training_titles`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;
