CREATE TABLE `web_traffic_daily` (
    `date` DATE NOT NULL,
    `pageviews` INTEGER NOT NULL DEFAULT 0,
    `unique_visitors` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `web_traffic_daily_visitors` (
    `date` DATE NOT NULL,
    `visitor_hash` CHAR(64) NOT NULL,
    `first_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`date`, `visitor_hash`),
    CONSTRAINT `web_traffic_daily_visitors_date_fkey`
        FOREIGN KEY (`date`) REFERENCES `web_traffic_daily`(`date`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
