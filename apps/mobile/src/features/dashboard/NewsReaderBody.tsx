import { memo } from "react";
import { Linking, Pressable, Text } from "react-native";

import { RemoteImage } from "@/components/RemoteImage";
import type { DashboardNewsPost } from "@/features/dashboard/dashboardNewsApi";
import {
  parseDashboardNewsImage,
  stripDashboardNewsFormatting,
} from "@/features/dashboard/dashboardNewsPresentation";
import { newsReaderStyles as styles } from "@/features/dashboard/newsReaderStyleDefs";

interface NewsReaderBodyProps {
  post: DashboardNewsPost;
}

function NewsReaderBodyBase({ post }: NewsReaderBodyProps) {
  const body = post.body || post.summary;

  return (
    <>
      {body.split("\n").map((line, index) => {
        const image = parseDashboardNewsImage(line.trim());
        const key = `${index}-${line.slice(0, 12)}`;

        if (image) {
          return (
            <Pressable
              key={key}
              accessibilityRole="imagebutton"
              accessibilityLabel={image.alt}
              onPress={() => void Linking.openURL(image.src)}
            >
              <RemoteImage
                cacheKey={`dashboard-news-body-${image.src}`}
                contentFit="contain"
                source={{ uri: image.src }}
                style={styles.readerBodyImage}
              />
            </Pressable>
          );
        }

        return (
          <Text key={key} style={styles.readerBodyText}>
            {stripDashboardNewsFormatting(line) || " "}
          </Text>
        );
      })}
    </>
  );
}

export const NewsReaderBody = memo(NewsReaderBodyBase);
