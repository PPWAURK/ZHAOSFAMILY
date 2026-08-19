import { Directory, Paths } from "expo-file-system";
import { Image } from "expo-image";

const MEDIA_CACHE_ROOT_NAME = "zhao-user-media";

function sanitizeCacheSegment(value: number | string): string {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export function buildUserMediaCacheKey(
  userId: number | string,
  stableResourceId: string,
): string {
  return `${sanitizeCacheSegment(userId)}:${stableResourceId}`;
}

export function createUserMediaCacheDirectory(
  userId: number | string,
  category: string,
  stableResourceId: string,
): Directory {
  return new Directory(
    Paths.cache,
    MEDIA_CACHE_ROOT_NAME,
    sanitizeCacheSegment(userId),
    sanitizeCacheSegment(category),
    sanitizeCacheSegment(stableResourceId),
  );
}

export async function clearUserMediaCache(userId: number | string): Promise<void> {
  const directory = new Directory(Paths.cache, MEDIA_CACHE_ROOT_NAME, sanitizeCacheSegment(userId));

  if (directory.exists) {
    directory.delete();
  }

  await Promise.all([Image.clearMemoryCache(), Image.clearDiskCache()]);
}
