-- Business date (back-dating allowed) and optional destination store for inventory movements.
ALTER TABLE `inventory_movements`
  ADD COLUMN `occurred_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `restaurant_id` INTEGER NULL;

-- Existing movements happened when they were recorded.
UPDATE `inventory_movements` SET `occurred_at` = `created_at`;

CREATE INDEX `inventory_movements_occurred_at_idx` ON `inventory_movements`(`occurred_at`);
CREATE INDEX `inventory_movements_restaurant_id_idx` ON `inventory_movements`(`restaurant_id`);

ALTER TABLE `inventory_movements`
  ADD CONSTRAINT `inventory_movements_restaurant_id_fkey`
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
