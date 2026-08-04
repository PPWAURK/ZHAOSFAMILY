-- ZHAO Groupe uses 000, so Parly2 becomes the thirteenth operating store.
UPDATE `restaurants`
SET `store_code` = 13
WHERE LOWER(`name`) LIKE '%parly%'
  AND `store_code` = 14;
