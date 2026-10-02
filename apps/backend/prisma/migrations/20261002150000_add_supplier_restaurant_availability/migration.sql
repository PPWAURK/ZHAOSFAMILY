ALTER TABLE `fournisseurs`
  ADD COLUMN `available_to_all_restaurants` BOOLEAN NOT NULL DEFAULT false AFTER `sort_order`;

UPDATE `fournisseurs`
SET `available_to_all_restaurants` = true;

CREATE TABLE `supplier_restaurant_availabilities` (
  `supplier_id` INTEGER NOT NULL,
  `restaurant_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `supplier_restaurant_availabilities_restaurant_id_idx`(`restaurant_id`),
  PRIMARY KEY (`supplier_id`, `restaurant_id`),
  CONSTRAINT `supplier_store_avail_supplier_fk`
    FOREIGN KEY (`supplier_id`) REFERENCES `fournisseurs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `supplier_store_avail_restaurant_fk`
    FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
