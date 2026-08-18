import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageProps, type ImageSource } from "expo-image";
import { Skeleton } from "@/components/Skeleton";

type RemoteImageProps = Omit<ImageProps, "source" | "style"> & {
  fallback?: ReactNode;
  source: ImageSource | null;
  style: StyleProp<ImageStyle>;
};

export function RemoteImage({ fallback, source, style, ...props }: RemoteImageProps): ReactNode {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const hasSource = Boolean(source);
  const sourceKey =
    typeof source === "object" && source !== null && "uri" in source
      ? String(source.uri)
      : String(source);

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
        contentFit="cover"
        source={source}
        style={styles.fill}
        transition={180}
        onError={() => setHasError(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
      {isLoading ? <Skeleton style={styles.fill} /> : null}
    </View>
  );
}

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
