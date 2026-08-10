ALTER TABLE `purchase_orders`
  ADD COLUMN `case_size` INT NULL,
  ADD COLUMN `case_size_2` INT NULL,
  ADD COLUMN `case_size_3` INT NULL;

ALTER TABLE `purchase_order_items`
  ADD COLUMN `case_size` INT NULL;
