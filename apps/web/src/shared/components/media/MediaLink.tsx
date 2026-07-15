"use client";

import { useState, type ReactNode } from "react";
import { fetchSignedMediaUrl } from "@/shared/api/api-client";

type MediaLinkProps = {
  objectKey: string | null | undefined;
  children: ReactNode;
  className?: string;
};

/**
 * A link that opens a media object in a new tab. The presigned URL is resolved
 * lazily on click (not on render), so a list of links doesn't sign every item
 * up front. The session token never enters the URL.
 */
export function MediaLink({ objectKey, children, className }: MediaLinkProps) {
  const [isResolving, setIsResolving] = useState(false);

  return (
    <a
      className={className}
      href="#"
      aria-busy={isResolving}
      onClick={(event) => {
        event.preventDefault();
        if (isResolving || !objectKey) {
          return;
        }
        setIsResolving(true);
        void fetchSignedMediaUrl(objectKey)
          .then(({ url }) => {
            window.open(url, "_blank", "noopener,noreferrer");
          })
          .finally(() => setIsResolving(false));
      }}
    >
      {children}
    </a>
  );
}
