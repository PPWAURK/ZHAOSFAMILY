CREATE TABLE `recipes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `tags` JSON NULL,
  `servings` INTEGER NOT NULL DEFAULT 1,
  `preparation_minutes` INTEGER NOT NULL DEFAULT 0,
  `cooking_minutes` INTEGER NOT NULL DEFAULT 0,
  `cover_image_url` TEXT NULL,
  `finished_image_url` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `created_by_user_id` INTEGER NULL,
  `updated_by_user_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `recipes_status_category_idx` (`status`, `category`),
  INDEX `recipes_created_at_idx` (`created_at`),
  CONSTRAINT `recipes_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `recipes_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `recipe_job_roles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `recipe_id` INTEGER NOT NULL,
  `job_role` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `recipe_job_roles_recipe_id_job_role_key` (`recipe_id`, `job_role`),
  INDEX `recipe_job_roles_job_role_idx` (`job_role`),
  CONSTRAINT `recipe_job_roles_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `recipe_ingredients` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `recipe_id` INTEGER NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `recipe_ingredients_recipe_id_sort_order_idx` (`recipe_id`, `sort_order`),
  CONSTRAINT `recipe_ingredients_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `recipe_steps` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `recipe_id` INTEGER NOT NULL,
  `instruction` TEXT NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `recipe_steps_recipe_id_sort_order_idx` (`recipe_id`, `sort_order`),
  CONSTRAINT `recipe_steps_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
