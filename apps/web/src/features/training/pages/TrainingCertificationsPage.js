"use client";

import TrainingLayout from "@/features/training/components/TrainingLayout";
import {
  TRAINING_CERTIFICATIONS,
  TRAINING_COPY,
} from "@/features/training/constants/training-copy";

function CertificationCard({ item, labels, styles }) {
  const stampTop = item.code.split("-")[0];
  const stampBottom = item.code.split("-").slice(1).join("-");
  const lockedStamp = item.status === "locked" || item.status === "available";

  return (
    <article className={`${styles.certCard} ${styles[`certCard${item.status}`]}`}>
      <div className={styles.certRank}>
        <span className={styles.certRankBadge}>{item.rank}</span>
        <span>{item.code}</span>
      </div>

      <div className={styles.certStampRow}>
        <div className={styles.certStampBox}>
          {lockedStamp ? (
            <span className={styles.certLock}>?</span>
          ) : (
            <>
              <span className={styles.certStampTop}>{stampTop}</span>
              <span className={styles.certStampBottom}>{stampBottom}</span>
            </>
          )}
        </div>

        <div>
          <h3 className={styles.certTitle}>
            {item.title}
            <span className={styles.certTitleEn}>{item.en}</span>
          </h3>
        </div>
      </div>

      <p className={styles.certDesc}>{item.desc}</p>

      <div className={styles.certFoot}>
        {item.granted ? (
          <div>
            GRANTED <b>{item.granted}</b>
          </div>
        ) : null}
        {item.expire ? (
          <div>
            EXPIRE <b>{item.expire}</b>
          </div>
        ) : null}
        <div>
          BY <b>{item.by || "-"}</b>
        </div>
        <div className={styles.certStatusRow}>
          <span className={styles.certBadge}>
            <span className={styles.certBadgeDot} />
            {labels.certBadge[item.status]}
          </span>
          <button type="button" className={styles.certAction}>
            {labels.certAction[item.status]}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function TrainingCertificationsPage() {
  return (
    <TrainingLayout
      pageCopy={{
        zh: {
          shared: TRAINING_COPY.zh.shared,
          page: TRAINING_COPY.zh.certifications,
        },
        en: {
          shared: TRAINING_COPY.en.shared,
          page: TRAINING_COPY.en.certifications,
        },
        fr: {
          shared: TRAINING_COPY.fr.shared,
          page: TRAINING_COPY.fr.certifications,
        },
      }}
    >
      {({ t, styles }) => (
        <>
          <section className={styles.pageHeaderCard}>
            <div>
              <p className={styles.pageStep}>
                <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                <span>{t.page.stepDetail}</span>
              </p>
            </div>
            <div className={styles.metricGrid}>
              {t.page.metrics.map((metric) => (
                <article key={metric.label} className={styles.metricCard}>
                  <p className={styles.metricValue}>{metric.value}</p>
                  <p className={styles.metricLabel}>{metric.label}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionBar}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionCounter}>A</span>
                <span>{t.page.requiredHeading}</span>
                <span className={styles.sectionTitleEn}>{t.page.requiredEn}</span>
              </h2>
            </div>
            <div className={styles.certGrid}>
              {TRAINING_CERTIFICATIONS.required.map((item) => (
                <CertificationCard
                  key={item.id}
                  item={item}
                  labels={t.shared}
                  styles={styles}
                />
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionBar}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionCounter}>B</span>
                <span>{t.page.optionalHeading}</span>
                <span className={styles.sectionTitleEn}>{t.page.optionalEn}</span>
              </h2>
            </div>
            <div className={styles.certGrid}>
              {TRAINING_CERTIFICATIONS.optional.map((item) => (
                <CertificationCard
                  key={item.id}
                  item={item}
                  labels={t.shared}
                  styles={styles}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </TrainingLayout>
  );
}
