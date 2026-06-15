-- CreateTable
CREATE TABLE `ai_quiz_config` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `api_key_enc` TEXT NULL,
  `base_url` VARCHAR(300) NULL,
  `model` VARCHAR(150) NULL,
  `max_tokens` INTEGER NULL,
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
