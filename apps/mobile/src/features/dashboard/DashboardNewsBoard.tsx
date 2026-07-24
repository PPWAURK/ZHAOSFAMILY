import { Ionicons } from "@expo/vector-icons";
import { createVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import type { DashboardCopy } from "@/features/dashboard/dashboardCopy";
import { dashboardNewsBoardStyles as styles } from "@/features/dashboard/dashboardNewsBoardStyles";
import type {
  DashboardNewsAttachment,
  DashboardNewsPost,
} from "@/features/dashboard/dashboardNewsApi";
import {
  buildDashboardNewsImageViewerHtml,
  findDashboardNewsBodyImage,
  formatDashboardNewsDate,
  isDashboardNewsSummaryDistinct,
  NEWS_CATEGORY_FILTERS,
  resolveNewsDeskCategory,
  stripDashboardNewsFormatting,
  type NewsDeskCategory,
} from "@/features/dashboard/dashboardNewsPresentation";
import zhaoSealSource from "../../../assets/title-frames/zhao-seal.png";

type DashboardNewsBoardProps = {
  activeCategory: NewsDeskCategory;
  activeIndex: number;
  copy: DashboardCopy;
  error: string;
  isLoading: boolean;
  onMove: (direction: "previous" | "next") => void;
  onOpenPost: (post: DashboardNewsPost) => void;
  onSearchChange: (value: string) => void;
  onSelectCategory: (category: NewsDeskCategory) => void;
  posts: DashboardNewsPost[];
  searchTerm: string;
  visiblePosts: DashboardNewsPost[];
};

type FeaturedMedia =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; src: string; alt: string }
  | { kind: "pdf"; src: string; alt: string }
  | null;

function getAttachmentKind(
  attachment: DashboardNewsAttachment | null,
): "image" | "video" | "pdf" | null {
  if (!attachment) return null;

  const mimeType = attachment.mimeType.toLowerCase();
  const fileName = attachment.name.toLowerCase();

  if (mimeType.startsWith("image/") || /\.(avif|gif|jpe?g|png|webp)$/.test(fileName)) {
    return "image";
  }
  if (mimeType.startsWith("video/") || /\.(m4v|mov|mp4|webm)$/.test(fileName)) {
    return "video";
  }
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    return "pdf";
  }

  return null;
}

function getFeaturedMedia(post: DashboardNewsPost): FeaturedMedia {
  const attachmentKind = getAttachmentKind(post.attachment);

  if (attachmentKind && post.attachment?.href) {
    return {
      kind: attachmentKind,
      src: post.attachment.href,
      alt: post.attachment.name || post.title,
    };
  }

  const bodyImage = findDashboardNewsBodyImage(post.body);

  return bodyImage
    ? { kind: "image", src: bodyImage.src, alt: bodyImage.alt || post.title }
    : null;
}

function NewsVideo({ uri }: { uri: string }) {
  const [player] = useState(() => createVideoPlayer({ uri }));

  useEffect(
    () => () => {
      player.release();
    },
    [player],
  );

  return (
    <VideoView
      contentFit="contain"
      nativeControls
      player={player}
      style={styles.featureVideo}
      surfaceType={Platform.OS === "android" ? "textureView" : undefined}
    />
  );
}

function NewsFeaturedMedia({
  media,
}: {
  media: FeaturedMedia;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => setHasError(false), [media?.src]);

  if (!media || hasError) {
    return (
      <View style={styles.featureFallback}>
        <Image
          source={zhaoSealSource}
          style={styles.featureFallbackSeal}
          resizeMode="contain"
        />
        <Text style={styles.featureFallbackText}>ZHAO&apos;S FAMILY</Text>
      </View>
    );
  }

  if (media.kind === "video") {
    return <NewsVideo key={media.src} uri={media.src} />;
  }

  if (media.kind === "pdf") {
    return (
      <View style={styles.featurePdfFrame}>
        <WebView
          bounces
          nestedScrollEnabled
          originWhitelist={["*"]}
          scalesPageToFit
          scrollEnabled
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          setSupportMultipleWindows={false}
          showsHorizontalScrollIndicator
          showsVerticalScrollIndicator
          source={{ uri: media.src }}
          startInLoadingState
          style={styles.featurePdf}
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  return (
    <WebView
      accessibilityLabel={media.alt}
      bounces
      nestedScrollEnabled
      originWhitelist={["*"]}
      scalesPageToFit
      scrollEnabled
      setBuiltInZoomControls
      setDisplayZoomControls={false}
      setSupportMultipleWindows={false}
      showsHorizontalScrollIndicator
      showsVerticalScrollIndicator
      source={{ html: buildDashboardNewsImageViewerHtml(media.src) }}
      style={styles.featureImage}
      onError={() => setHasError(true)}
      onMessage={(event) => {
        if (event.nativeEvent.data === "image-error") setHasError(true);
      }}
    />
  );
}

function replacePositionTokens(template: string, current: number, total: number): string {
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

export function DashboardNewsBoard({
  activeCategory,
  activeIndex,
  copy,
  error,
  isLoading,
  onMove,
  onOpenPost,
  onSearchChange,
  onSelectCategory,
  posts,
  searchTerm,
  visiblePosts,
}: DashboardNewsBoardProps) {
  const categoryCounts = useMemo(
    () =>
      NEWS_CATEGORY_FILTERS.reduce<Record<NewsDeskCategory, number>>(
        (counts, category) => ({
          ...counts,
          [category]: posts.filter(
            (post) => resolveNewsDeskCategory(post.category) === category,
          ).length,
        }),
        { news: 0, congrats: 0, issues: 0 },
      ),
    [posts],
  );
  const activePost = visiblePosts[activeIndex] ?? null;
  const featuredMedia = activePost ? getFeaturedMedia(activePost) : null;
  const summaryPreview = activePost
    ? stripDashboardNewsFormatting(activePost.summary)
    : "";
  const bodyPreview = activePost ? stripDashboardNewsFormatting(activePost.body) : "";
  const articlePreview = bodyPreview || summaryPreview;
  const showDistinctSummary = activePost
    ? isDashboardNewsSummaryDistinct(activePost.summary, activePost.body)
    : false;
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < visiblePosts.length - 1;

  return (
    <View style={styles.board}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {NEWS_CATEGORY_FILTERS.map((category) => {
          const isActive = activeCategory === category;

          return (
            <Pressable
              key={category}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[styles.tab, isActive ? styles.tabActive : null]}
              onPress={() => onSelectCategory(category)}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                {copy.newsCategories[category]}
              </Text>
              <Text style={[styles.tabCount, isActive ? styles.tabLabelActive : null]}>
                {categoryCounts[category]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!isLoading && posts.length > 0 ? (
        <View style={styles.search}>
          <Ionicons
            color={authControlStyles.colors.ink40}
            name="search-outline"
            size={18}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={copy.newsSearchPlaceholder}
            placeholderTextColor={authControlStyles.colors.ink40}
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={onSearchChange}
          />
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.state}>
          <ZhaoLoadingIndicator label={copy.loadingNews} />
        </View>
      ) : null}

      {!isLoading && error ? <Text style={styles.stateText}>{error}</Text> : null}

      {!isLoading && !error && posts.length === 0 ? (
        <Text style={styles.stateText}>{copy.emptyNews}</Text>
      ) : null}

      {!isLoading && !error && posts.length > 0 && !activePost ? (
        <Text style={styles.stateText}>{copy.newsNoSearchResult}</Text>
      ) : null}

      {!isLoading && !error && activePost ? (
        <>
          <View style={styles.articleHeader}>
            <View style={styles.articleKickerRow}>
              <Text style={styles.articleKicker}>{copy.newsCategories[activeCategory]}</Text>
              <Text style={styles.visibility}>
                {copy.newsVisibility[
                  activePost.visibility === "management" ? "management" : "public"
                ]}
              </Text>
            </View>
            <Text style={styles.articleTitle}>
              {stripDashboardNewsFormatting(activePost.title)}
            </Text>
            <Text style={styles.articleMeta}>
              {formatDashboardNewsDate(activePost.createdAt)} ·{" "}
              {activePost.authorName || "-"}
            </Text>
            <View style={styles.articleControls}>
              {activePost.tags.length > 0 ? (
                <View style={styles.tags}>
                  {activePost.tags.map((tag) => (
                    <Text key={tag} style={styles.tag}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.pager}>
                <Pressable
                  accessibilityLabel={copy.newsPrevious}
                  accessibilityRole="button"
                  disabled={!canGoPrevious}
                  style={[
                    styles.pagerButton,
                    !canGoPrevious ? styles.pagerDisabled : null,
                  ]}
                  onPress={() => onMove("previous")}
                >
                  <Ionicons
                    color={authControlStyles.colors.red}
                    name="arrow-back-outline"
                    size={18}
                  />
                </Pressable>
                <Text style={styles.pagerPosition}>
                  {replacePositionTokens(
                    copy.newsPosition,
                    activeIndex + 1,
                    visiblePosts.length,
                  )}
                </Text>
                <Pressable
                  accessibilityLabel={copy.newsNext}
                  accessibilityRole="button"
                  disabled={!canGoNext}
                  style={[
                    styles.pagerButton,
                    !canGoNext ? styles.pagerDisabled : null,
                  ]}
                  onPress={() => onMove("next")}
                >
                  <Ionicons
                    color={authControlStyles.colors.red}
                    name="arrow-forward-outline"
                    size={18}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.featureMedia}>
            <NewsFeaturedMedia
              key={`${activePost.id}-${featuredMedia?.src || "fallback"}`}
              media={featuredMedia}
            />
          </View>

          <Pressable
            accessibilityHint={copy.newsReadMore}
            accessibilityRole="button"
            style={styles.articleContent}
            onPress={() => onOpenPost(activePost)}
          >
            {showDistinctSummary ? (
              <Text style={styles.articleSummary}>{summaryPreview}</Text>
            ) : null}
            <Text
              style={[
                styles.articleBody,
                showDistinctSummary ? styles.articleBodyWithSummary : null,
              ]}
            >
              {articlePreview}
            </Text>
            <View style={styles.articleFooter}>
              <Text style={styles.articleStore}>
                {activePost.restaurantName || "-"}
              </Text>
              <Ionicons
                color={authControlStyles.colors.red}
                name="arrow-forward-outline"
                size={18}
              />
            </View>
          </Pressable>

        </>
      ) : null}

    </View>
  );
}
