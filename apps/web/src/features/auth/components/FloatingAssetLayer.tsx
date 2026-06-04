"use client";

import type { CSSProperties } from "react";

import { FLOATING_ASSET_ITEMS } from "@/features/auth/constants/floating-assets";
import styles from "@/features/auth/auth-page.module.css";

type FloatingAssetStyle = CSSProperties & {
  "--asset-width": string;
  "--asset-left": string;
  "--asset-delay": string;
  "--asset-duration": string;
  "--asset-drift": string;
  "--asset-rotate-start": string;
  "--asset-rotate-end": string;
  "--asset-start-y": string;
};

export default function FloatingAssetLayer() {
  return (
    <div className={styles.floatingAssetLayer} aria-hidden="true">
      {FLOATING_ASSET_ITEMS.map((item, index) => {
        const assetStyle = {
          "--asset-width": `${item.width}px`,
          "--asset-left": item.left,
          "--asset-delay": item.delay,
          "--asset-duration": item.duration,
          "--asset-drift": item.drift,
          "--asset-rotate-start": item.rotateStart,
          "--asset-rotate-end": item.rotateEnd,
          "--asset-start-y": item.startY,
        } as FloatingAssetStyle;

        return (
          <img
            key={`${item.src}-${index}`}
            className={styles.floatingAsset}
            src={item.src}
            alt={item.alt}
            draggable="false"
            style={assetStyle}
          />
        );
      })}
    </div>
  );
}
