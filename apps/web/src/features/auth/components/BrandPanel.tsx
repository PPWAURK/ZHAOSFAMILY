"use client";

import type { ComponentType, CSSProperties } from "react";
import { motion, type MotionStyle } from "motion/react";

import ScrollVelocity from "@/components/ScrollVelocity/ScrollVelocity";
import { VELOCITY_TEXTS } from "@/features/auth/constants/auth-ui";
import FloatingAssetLayer from "@/features/auth/components/FloatingAssetLayer";
import styles from "@/features/auth/auth-page.module.css";
import type { LiaoSwingHandlers } from "@/features/auth/hooks/useLiaoSwing";

type BrandPanelProps = {
  liaoSwing: LiaoSwingHandlers;
};

type LiaoImageStyle = CSSProperties & {
  "--liao-rotate-y": LiaoSwingHandlers["rotationVar"];
};

export default function BrandPanel({ liaoSwing }: BrandPanelProps) {
  const {
    isDragging,
    rotationVar,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = liaoSwing;
  const liaoImageStyle = {
    "--liao-rotate-y": rotationVar,
  } as LiaoImageStyle;
  const ScrollVelocityComponent = ScrollVelocity as unknown as ComponentType<
    Record<string, unknown>
  >;

  return (
    <section className={styles.brand}>
      <FloatingAssetLayer />

      <motion.img
        className={`${styles.bgLiao} ${isDragging ? styles.bgLiaoDragging : ""}`}
        aria-hidden="true"
        src="/ZHAO-元素element/文字/白色字体/未标题-3-18.png"
        alt=""
        draggable="false"
        style={liaoImageStyle as unknown as MotionStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      />

      <div className={styles.velocityDock} aria-hidden="true">
        <ScrollVelocityComponent
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
