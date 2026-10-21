ALTER TABLE `recruitment_requests`
  ADD COLUMN `is_published` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `recruitment_requests_is_published_status_created_at_idx`
  ON `recruitment_requests` (`is_published`, `status`, `created_at`);
