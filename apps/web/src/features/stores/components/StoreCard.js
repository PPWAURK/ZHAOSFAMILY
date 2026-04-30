"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

import styles from "@/features/stores/stores-page.module.css";

const DEFAULT_STORE_PHOTO = "/logo2024/logo2024.jpg";

export default function StoreCard({ store, index, lang, labels }) {
  const [imageSrc, setImageSrc] = useState(store.photoPath || DEFAULT_STORE_PHOTO);
  const isOpen = store.status === "open";
  const statusLabel = isOpen ? labels.statusOpen : labels.statusClosed;
  const address = store.address || "—";
  const storeCode = store.storeCode || "—";

  useEffect(() => {
    setImageSrc(store.photoPath || DEFAULT_STORE_PHOTO);
  }, [store.photoPath]);

  return (
    <Link href={`/dashboard/stores/${store.id}`} className={styles.card}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 0.1 + index * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className={styles.cardTop}>
          <span className={styles.cardIndex}>
            <span className={styles.cardIndexNum}>
              {String(index + 1).padStart(2, "0")}
            </span>
          </span>

          <span
            className={`${styles.cardStatus} ${
              isOpen ? styles.cardStatusOpen : styles.cardStatusClosed
            }`}
          >
            <span className={styles.cardStatusDot} aria-hidden="true" />
            {statusLabel}
          </span>
        </div>

        <div className={styles.cardMedia}>
          <img
            src={imageSrc}
            alt={`${store.name} storefront`}
            loading="lazy"
            decoding="async"
            onError={() => setImageSrc(DEFAULT_STORE_PHOTO)}
          />
          <span className={styles.cardMediaShade} aria-hidden="true" />
          <span className={styles.cardMediaCode}>{storeCode}</span>
        </div>

        <div className={styles.cardBody}>
          <h2 className={styles.cardName}>{store.name}</h2>

          <dl className={styles.cardMeta}>
            <div className={styles.cardMetaRow}>
              <dt>{labels.codeLabel}</dt>
              <dd>{storeCode}</dd>
            </div>
            <div className={styles.cardMetaRow}>
              <dt>{labels.addressLabel}</dt>
              <dd>{address}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.cardTags} />

        <span className={styles.cardArrow} aria-hidden="true">
          →
        </span>
      </motion.div>
    </Link>
  );
}
