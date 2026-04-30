"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

import styles from "@/features/auth/auth-page.module.css";

const CARD_SPRING = {
  stiffness: 220,
  damping: 18,
  mass: 0.7,
};
const DEFAULT_STORE_PHOTO = "/logo2024/logo2024.jpg";

export default function StoreTiltCard({
  store,
  index,
  isSelected,
  onSelect,
  pickLabel,
  selectedLabel,
}) {
  const cardRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(store.photoPath);
  const prefersReducedMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), CARD_SPRING);
  const rotateY = useSpring(useMotionValue(0), CARD_SPRING);
  const glareX = useSpring(useMotionValue(50), CARD_SPRING);
  const glareY = useSpring(useMotionValue(50), CARD_SPRING);
  const glareLeft = useMotionTemplate`${glareX}%`;
  const glareTop = useMotionTemplate`${glareY}%`;

  useEffect(() => {
    setImageSrc(store.photoPath);
  }, [store.photoPath]);

  function resetTilt() {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }

  function handlePointerMove(event) {
    if (prefersReducedMotion || !cardRef.current) {
      return;
    }

    const bounds = cardRef.current.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const nextRotateY = ((pointerX - centerX) / centerX) * 10;
    const nextRotateX = ((centerY - pointerY) / centerY) * 10;

    rotateX.set(nextRotateX);
    rotateY.set(nextRotateY);
    glareX.set((pointerX / bounds.width) * 100);
    glareY.set((pointerY / bounds.height) * 100);
  }

  return (
    <div className={styles.storeCardFrame}>
      <motion.button
        ref={cardRef}
        type="button"
        className={`${styles.storeCard} ${isSelected ? styles.storeCardSelected : ""}`}
        onClick={() => onSelect(store.id)}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onBlur={resetTilt}
        style={{
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
        }}
      >
        <motion.span
          aria-hidden="true"
          className={styles.storeCardGlare}
          style={{
            left: prefersReducedMotion ? "50%" : glareLeft,
            top: prefersReducedMotion ? "50%" : glareTop,
          }}
        />
        <span className={styles.storeCardContent}>
          <span className={styles.storeCardMedia}>
            <span className={styles.storeCardMediaShade} aria-hidden="true" />
            <span className={styles.storeCardMediaBadge}>{store.storeCode}</span>
            <img
              src={imageSrc}
              alt={`${store.name} storefront`}
              className={styles.storeCardPhoto}
              loading="lazy"
              decoding="async"
              onError={() => setImageSrc(DEFAULT_STORE_PHOTO)}
            />
          </span>

          <span className={styles.storeCardTop}>
            <span className={styles.storeCardCode}>
              <kbd className={styles.storeCardKbd}>{String(index + 1)}</kbd>
              <span>{store.name}</span>
            </span>
          </span>

          <span className={styles.storeCardBody}>
            <strong className={styles.storeCardName}>{store.name}</strong>
            <span className={styles.storeCardArea}>{store.address}</span>
          </span>

          <span className={styles.storeCardBottom}>
            <span className={styles.storeCardFootMeta}>{store.storeCode}</span>
            <span className={styles.storeCardPickGroup}>
              <span className={styles.storeCardPick}>
                {isSelected ? selectedLabel : pickLabel}
              </span>
            </span>
          </span>
        </span>
      </motion.button>
    </div>
  );
}
