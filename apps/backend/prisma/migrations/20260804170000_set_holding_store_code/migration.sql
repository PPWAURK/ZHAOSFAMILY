-- ZHAO Groupe is the management company, not an operating store.
UPDATE `restaurants`
SET `store_code` = 0
WHERE LOWER(`name`) = 'zhao groupe';
