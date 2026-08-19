import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageProps, type ImageSource } from "expo-image";
import { useStore } from "zustand";
import { Skeleton } from "@/components/Skeleton";
import { mobileAuthStore } from "@/lib/api";
import {
  APP_IMAGE_LOAD_PRIORITIES,
  type AppImageLoadPriority,
} from "@/lib/imagePriority";
import { buildUserMediaCacheKey } from "@/lib/mediaCache";

type AppImageProps = Omit<ImageProps, "priority" | "source" | "style"> & {
  cacheKey?: string;
  fallback?: ReactNode;
  loadPriority?: AppImageLoadPriority;
  source: ImageSource | null;
  style: StyleProp<ImageStyle>;
};

export function AppImage({
  cacheKey,
  contentFit = "cover",
  fallback,
  loadPriority = "important",
  onError,
  onLoadEnd,
  source,
  style,
  ...props
}: AppImageProps): ReactNode {
  const userId = useStore(mobileAuthStore, (state) => state.user?.id ?? null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const hasSource = Boolean(source);
  const sourceUri =
    typeof source === "object" && source !== null && "uri" in source
      ? String(source.uri)
      : String(source);
  const resourceKey = cacheKey || sourceUri;
  const sourceKey = userId === null ? resourceKey : buildUserMediaCacheKey(userId, resourceKey);
  const imageSource =
    typeof source === "object" && source !== null && "uri" in source
      ? { ...source, cacheKey: sourceKey }
      : source;

  useEffect(() => {
    setHasError(false);
    setIsLoading(hasSource);
  }, [hasSource, sourceKey]);

  if (!source || hasError) {
    return (
      <View style={[styles.fallback, style as StyleProp<ViewStyle>]}>
        {fallback ?? <Skeleton style={styles.fill} />}
      </View>
    );
  }

  return (
    <View style={[styles.container, style as StyleProp<ViewStyle>]}>
      <Image
        {...props}
        cachePolicy="memory-disk"
        contentFit={contentFit}
        priority={APP_IMAGE_LOAD_PRIORITIES[loadPriority]}
        recyclingKey={sourceKey}
        source={imageSource}
        style={styles.fill}
        transition={0}
        onError={(event) => {
          setHasError(true);
          onError?.(event);
        }}
        onLoadEnd={() => {
          setIsLoading(false);
          onLoadEnd?.();
        }}
      />
      {isLoading ? <Skeleton style={styles.fill} /> : null}
    </View>
  );
}

// Keep the previous name available while feature modules migrate to the shared image API.
export const RemoteImage = AppImage;

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    justifyContent: "center",
    overflow: "hidden",
  },
  container: { overflow: "hidden" },
  fill: { height: "100%", width: "100%" },
});
