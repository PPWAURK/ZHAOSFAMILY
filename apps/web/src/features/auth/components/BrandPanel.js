"use client";

import { motion } from "motion/react";

import ScrollVelocity from "@/components/ScrollVelocity/ScrollVelocity";
import { VELOCITY_TEXTS } from "@/features/auth/constants/auth-ui";
import FloatingAssetLayer from "@/features/auth/components/FloatingAssetLayer";
import styles from "@/features/auth/auth-page.module.css";

export default function BrandPanel({ liaoSwing }) {
  const {
    isDragging,
    rotationVar,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = liaoSwing;

  return (
    <section className={styles.brand}>
      <FloatingAssetLayer />

      <motion.img
        className={`${styles.bgLiao} ${isDragging ? styles.bgLiaoDragging : ""}`}
        aria-hidden="true"
        src="/ZHAO-元素element/文字/白色字体/未标题-3-18.png"
        alt=""
        draggable="false"
        style={{ "--liao-rotate-y": rotationVar }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      />

      <div className={styles.velocityDock} aria-hidden="true">
        <ScrollVelocity
          texts={VELOCITY_TEXTS}
          velocity={140}
          numCopies={5}
          damping={34}
          stiffness={180}
          parallaxClassName={`${styles.velocityParallax} parallax`}
          scrollerClassName={`${styles.velocityScroller} scroller`}
          className={styles.velocityText}
          scrollerStyle={{ fontSize: "25px", lineHeight: 1 }}
        />
      </div>

      <div className={styles.brandCenter}>
        <img
          className={styles.brandLogo}
          src="/ZHAO-元素element/logo/2-01.png"
          alt="ZHAO"
        />

        <div className={styles.brandSince}>
          <div className={styles.sinceDash} />
          <span className={styles.sinceText}>Since 2011</span>
          <div className={styles.sinceDash} />
        </div>
      </div>
    </section>
  );
}
