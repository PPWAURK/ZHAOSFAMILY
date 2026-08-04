ALTER TABLE `abc_store_scores`
  ADD COLUMN `rank` INT NULL AFTER `grade`,
  ADD UNIQUE INDEX `abc_store_scores_cycle_id_rank_key`(`cycle_id`, `rank`);
