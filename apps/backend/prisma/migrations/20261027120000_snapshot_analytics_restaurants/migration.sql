ALTER TABLE `app_usage_events` ADD COLUMN `restaurant_id` INTEGER NULL;
ALTER TABLE `dashboard_post_read_receipts` ADD COLUMN `restaurant_id` INTEGER NULL;

-- Historical rows use the employee's current assignment; new rows snapshot it at creation.
UPDATE `app_usage_events` AS event
INNER JOIN `users` AS employee ON employee.`id` = event.`user_id`
SET event.`restaurant_id` = employee.`restaurant_id`;

UPDATE `dashboard_post_read_receipts` AS receipt
INNER JOIN `users` AS employee ON employee.`id` = receipt.`user_id`
SET receipt.`restaurant_id` = employee.`restaurant_id`;

ALTER TABLE `app_usage_events` MODIFY COLUMN `restaurant_id` INTEGER NOT NULL;
ALTER TABLE `dashboard_post_read_receipts` MODIFY COLUMN `restaurant_id` INTEGER NOT NULL;

CREATE INDEX `app_usage_events_restaurant_id_occurred_at_idx`
  ON `app_usage_events`(`restaurant_id`, `occurred_at`);
CREATE INDEX `dashboard_post_read_receipts_restaurant_id_post_id_idx`
  ON `dashboard_post_read_receipts`(`restaurant_id`, `post_id`);

ALTER TABLE `app_usage_events`
  ADD CONSTRAINT `app_usage_events_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `dashboard_post_read_receipts`
  ADD CONSTRAINT `dashboard_post_read_receipts_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
