CREATE TABLE `training_job_role_positions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `job_role` VARCHAR(40) NOT NULL,
  `position_code` VARCHAR(40) NOT NULL,
  `include_descendants` BOOLEAN NOT NULL DEFAULT false,
  `grants_all_positions` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `training_job_role_positions_job_role_key`(`job_role`),
  INDEX `training_job_role_positions_position_code_idx`(`position_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
