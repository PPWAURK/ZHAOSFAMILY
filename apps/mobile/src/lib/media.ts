import { MOBILE_API_URL } from "@/lib/env";

/** Builds a runtime URL for a public store photo from its persisted object key. */
export function buildPublicStorePhotoUrl(objectKey: string): string {
  return `${MOBILE_API_URL}/media/public-file?objectKey=${encodeURIComponent(objectKey)}`;
}
