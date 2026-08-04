ALTER TABLE `restaurants`
  ADD COLUMN `store_code` INT NULL AFTER `id`;

-- The operational order was provided by the business. Internal restaurant IDs
-- remain untouched because they are referenced by users, orders, and reports.
UPDATE `restaurants`
SET `store_code` = CASE
  WHEN LOWER(`name`) LIKE '%canal%saint-martin%' THEN 1
  WHEN LOWER(`name`) LIKE '%grand%boulevard%' THEN 2
  WHEN LOWER(`name`) LIKE '%louvre%' THEN 3
  WHEN LOWER(`name`) LIKE '%opera%' THEN 4
  WHEN LOWER(`name`) LIKE '%montparnasse%' THEN 5
  WHEN LOWER(`name`) LIKE '%nilmon%' THEN 6
  WHEN LOWER(`name`) LIKE '%saint-germain-des%' THEN 7
  WHEN LOWER(`name`) LIKE '%boulogne%' THEN 8
  WHEN LOWER(`name`) LIKE '%bastille%' THEN 9
  WHEN LOWER(`name`) LIKE '%saint-boniface%' THEN 10
  WHEN LOWER(`name`) LIKE '%batignolles%' THEN 11
  WHEN LOWER(`name`) LIKE '%levallois%' THEN 12
  ELSE NULL
END;

-- Keep any store not shown in the supplied operational list after the twelve
-- ordered stores, preserving its current internal-ID order.
SET @next_store_code = 12;

UPDATE `restaurants`
SET `store_code` = (@next_store_code := @next_store_code + 1)
WHERE `store_code` IS NULL
ORDER BY `id` ASC;

ALTER TABLE `restaurants`
  MODIFY COLUMN `store_code` INT NOT NULL,
  ADD UNIQUE INDEX `restaurants_store_code_key` (`store_code`);
