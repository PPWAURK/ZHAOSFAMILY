"use client";

import { useState } from "react";

import styles from "@/features/orders/new-order-page.module.css";

export default function OrderProductImage({ image, alt, fallbackLabel }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!image || hasError) {
    return (
      <span className={styles.productImagePlaceholder} aria-hidden="true">
        {fallbackLabel}
      </span>
    );
  }

  return (
    <span
      className={`${styles.productImageFrame} ${
        isLoaded ? styles.productImageFrameLoaded : ""
      }`}
    >
      {!isLoaded ? <span className={styles.productImageSkeleton} /> : null}
      <img
        src={image}
        alt={alt}
        className={styles.productImage}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </span>
  );
}
