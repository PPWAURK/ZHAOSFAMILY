"use client";

import { useEffect, useState } from "react";
import { fetchTrainingMyBadges } from "@/features/training/services/trainingMediaApi";
import { buildBadgeImageUrl } from "@/shared/api/api-client";
import styles from "@/features/profile/profile-page.module.css";

function getBadgeName(badge, lang) {
  return badge?.name?.[lang] || badge?.name?.zh || badge?.code || "-";
}

function badgeInitial(badge, lang) {
  const name = badge?.name?.[lang] || badge?.name?.zh || badge?.code;
  return name ? name.charAt(0) : "?";
}

function BadgeImage({ badge, className }) {
  const [failed, setFailed] = useState(false);
  const src = buildBadgeImageUrl(badge.imageFileName || "badge.svg");

  if (failed) {
    return (
      <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="8" fill="none" stroke="#c11616" strokeWidth="2" />
        <text x="32" y="40" textAnchor="middle" fill="#c11616" fontSize="22" fontFamily="serif" fontWeight="700">
          {badgeInitial(badge, "zh")}
        </text>
      </svg>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function CertificationWall({ lang, labels }) {
  const [badges, setBadges] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchTrainingMyBadges();
        if (active) setBadges(data);
      } catch {
        if (active) setError("LOAD_ERROR");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className={styles.section}>
        <p className={styles.placeholder}>{labels.loading}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.section}>
        <p className={styles.sectionHint}>{labels.error}</p>
      </section>
    );
  }

  if (!badges) return null;

  const certified = badges.badges.filter((b) => b.status === "certified");
  const inProgress = badges.badges.filter(
    (b) => b.status === "in_progress" || b.status === "failed",
  );

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionHeadingGroup}>
          <h3 className={styles.sectionHeading}>{labels.heading}</h3>
          <p className={styles.sectionHint}>
            {labels.hint
              .replace("{earned}", certified.length)
              .replace("{total}", badges.totalCount)}
          </p>
        </div>
      </header>

      {certified.length > 0 ? (
        <div className={styles.certGrid}>
          {certified.map((badge) => (
            <div key={badge.code} className={styles.certCard}>
              <BadgeImage badge={badge} className={styles.certImage} />
              <div className={styles.certInfo}>
                <strong className={styles.certName}>
                  {getBadgeName(badge, lang)}
                </strong>
                <span className={styles.certMeta}>
                  {badge.level ? `${labels.level} ${badge.level}` : null}
                  {badge.level && badge.earnedAt ? " · " : null}
                  {badge.earnedAt ? badge.earnedAt.slice(0, 10) : null}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.placeholder}>{labels.empty}</p>
      )}

      {inProgress.length > 0 ? (
        <>
          <h4 className={styles.certSubheading}>{labels.inProgress}</h4>
          <div className={styles.certGrid}>
            {inProgress.map((badge) => (
              <div key={badge.code} className={styles.certCard}>
                <BadgeImage badge={badge} className={styles.certImage} />
                <div className={styles.certInfo}>
                  <strong className={styles.certName}>
                    {getBadgeName(badge, lang)}
                  </strong>
                  <div className={styles.certProgressTrack}>
                    <div
                      className={styles.certProgressFill}
                      style={{ width: `${badge.completionRate}%` }}
                    />
                  </div>
                  <span className={styles.certMeta}>
                    {badge.completionRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
