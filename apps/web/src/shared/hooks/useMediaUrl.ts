import { useQuery } from "@tanstack/react-query";
import { fetchSignedMediaUrl } from "@/shared/api/api-client";

// Backend signs media URLs for 4h (MEDIA_SIGNED_URL_TTL_SECONDS). Treat the
// cached URL as stale well before that so an open page re-signs before the URL
// can expire mid-view.
const MEDIA_URL_STALE_MS = 1000 * 60 * 60 * 3; // 3h

export type UseMediaUrlResult = {
  url: string | null;
  isLoading: boolean;
  isError: boolean;
  /** Force a fresh presigned URL (e.g. from an <img> onError handler). */
  refresh: () => void;
};

/**
 * Resolves an objectKey to a short-lived presigned URL for rendering media
 * (<img>/<video> src). Returns null while loading or when no key is given.
 */
export function useMediaUrl(
  objectKey: string | null | undefined,
): UseMediaUrlResult {
  const query = useQuery({
    queryKey: ["media-sign", objectKey],
    queryFn: () => fetchSignedMediaUrl(objectKey as string),
    enabled: Boolean(objectKey),
    staleTime: MEDIA_URL_STALE_MS,
    gcTime: MEDIA_URL_STALE_MS,
    retry: 1,
  });

  return {
    url: query.data?.url ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh: () => {
      void query.refetch();
    },
  };
}
