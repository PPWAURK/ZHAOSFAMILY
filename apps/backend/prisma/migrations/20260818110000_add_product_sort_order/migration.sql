ALTER TABLE `products`
  ADD COLUMN `is_in_stock` BOOLEAN NOT NULL DEFAULT true AFTER `is_active`,
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `is_in_stock`;

UPDATE `products`
JOIN (
  SELECT
    `id`,
    ROW_NUMBER() OVER (PARTITION BY `supplier_id` ORDER BY `id` ASC) AS `sort_order`
  FROM `products`
) AS `ordered_products` ON `ordered_products`.`id` = `products`.`id`
SET `products`.`sort_order` = `ordered_products`.`sort_order`;

CREATE INDEX `products_supplier_id_sort_order_idx`
  ON `products`(`supplier_id`, `sort_order`);
