"use client";

import {
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";
import { useMediaUrl } from "@/shared/hooks/useMediaUrl";

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  objectKey: string | null | undefined;
  /** Rendered while the presigned URL is loading or missing. */
  fallback?: ReactNode;
};

/**
 * <img> whose src is a short-lived presigned URL resolved from an objectKey.
 * If the browser fails to load it (e.g. the URL expired while the page stayed
 * open), it re-signs once and retries.
 */
export function MediaImage({
  objectKey,
  fallback = null,
  onError,
  ...imgProps
}: MediaImageProps) {
  const { url, refresh } = useMediaUrl(objectKey);
  const retriedRef = useRef(false);

  // Reset the one-shot retry guard whenever we get a new URL.
  useEffect(() => {
    retriedRef.current = false;
  }, [url]);

  const [hidden, setHidden] = useState(false);

  if (!url || hidden) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={url}
      onError={(event) => {
        if (!retriedRef.current) {
          retriedRef.current = true;
          refresh();
        } else {
          setHidden(true);
        }
        onError?.(event);
      }}
      {...imgProps}
    />
  );
}
