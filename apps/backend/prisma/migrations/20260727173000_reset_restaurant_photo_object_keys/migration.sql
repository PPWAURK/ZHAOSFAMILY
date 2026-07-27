-- Restaurant photos now persist the media object key, never a URL or token.
-- Product requested clearing all existing photo references before re-upload.
UPDATE `restaurants`
SET `photo_url` = NULL
WHERE `photo_url` IS NOT NULL;

ALTER TABLE `restaurants`
  CHANGE COLUMN `photo_url` `photo_object_key` VARCHAR(191) NULL;
