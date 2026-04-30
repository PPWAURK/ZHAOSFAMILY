"use client";

import { FLOATING_ASSET_ITEMS } from "@/features/auth/constants/floating-assets";
import styles from "@/features/auth/auth-page.module.css";

export default function FloatingAssetLayer() {
  return (
    <div className={styles.floatingAssetLayer} aria-hidden="true">
      {FLOATING_ASSET_ITEMS.map((item, index) => (
        <img
          key={`${item.src}-${index}`}
          className={styles.floatingAsset}
          src={item.src}
          alt={item.alt}
          draggable="false"
          style={{
            "--asset-width": `${item.width}px`,
            "--asset-left": item.left,
            "--asset-delay": item.delay,
            "--asset-duration": item.duration,
            "--asset-drift": item.drift,
            "--asset-rotate-start": item.rotateStart,
            "--asset-rotate-end": item.rotateEnd,
            "--asset-opacity": item.opacity,
            "--asset-start-y": item.startY,
          }}
        />
      ))}
    </div>
  );
}
