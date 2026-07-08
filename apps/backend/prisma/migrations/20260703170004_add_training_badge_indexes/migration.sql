-- Add indexes required by the current TrainingBadge Prisma model.
CREATE INDEX `training_badges_is_active_sort_order_idx`
  ON `training_badges`(`is_active`, `sort_order`);

CREATE INDEX `training_badges_track_idx`
  ON `training_badges`(`track`);
