-- DropForeignKey
ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_created_by_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `purchase_returns` DROP FOREIGN KEY `purchase_returns_created_by_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `dashboard_posts` DROP FOREIGN KEY `dashboard_posts_author_id_fkey`;

-- DropForeignKey
ALTER TABLE `recruitment_requests` DROP FOREIGN KEY `recruitment_requests_created_by_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `recruitment_requests` DROP FOREIGN KEY `recruitment_requests_handled_by_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `case_shares` DROP FOREIGN KEY `case_shares_author_id_fkey`;

-- DropForeignKey
ALTER TABLE `case_share_comments` DROP FOREIGN KEY `case_share_comments_author_id_fkey`;

-- AlterTable
ALTER TABLE `purchase_orders` MODIFY `created_by_user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `purchase_returns` MODIFY `created_by_user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `dashboard_posts` MODIFY `author_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `recruitment_requests` MODIFY `created_by_user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `case_shares` MODIFY `author_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `case_share_comments` MODIFY `author_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `legacy_news_posts` MODIFY `created_by_user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `legacy_recruitment_requests` MODIFY `created_by_user_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_posts` ADD CONSTRAINT `dashboard_posts_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_requests` ADD CONSTRAINT `recruitment_requests_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_requests` ADD CONSTRAINT `recruitment_requests_handled_by_user_id_fkey` FOREIGN KEY (`handled_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_shares` ADD CONSTRAINT `case_shares_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_share_comments` ADD CONSTRAINT `case_share_comments_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

