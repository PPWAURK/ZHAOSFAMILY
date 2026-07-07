ALTER TABLE `users`
  ADD COLUMN `equipped_training_title_code` VARCHAR(40) NULL;

CREATE INDEX `users_equipped_training_title_code_idx`
  ON `users`(`equipped_training_title_code`);

ALTER TABLE `users`
  ADD CONSTRAINT `users_equipped_training_title_code_fkey`
  FOREIGN KEY (`equipped_training_title_code`)
  REFERENCES `training_titles`(`code`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
