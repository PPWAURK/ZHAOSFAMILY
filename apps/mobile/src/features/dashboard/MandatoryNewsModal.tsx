import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { RemoteImage } from "@/components/RemoteImage";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import type { DashboardNewsPost } from "@/features/dashboard/dashboardNewsApi";
import {
  formatAttachmentSize,
  isImageAttachment,
  isPdfAttachment,
} from "@/features/dashboard/dashboardNewsAttachment";
import { createDashboardNewsPdfViewer } from "@/features/dashboard/dashboardNewsPdfPreview";
import {
  formatDashboardNewsDate,
  isDashboardNewsSummaryDistinct,
  stripDashboardNewsFormatting,
} from "@/features/dashboard/dashboardNewsPresentation";
import { NewsReaderBody } from "@/features/dashboard/NewsReaderBody";
import { newsReaderStyles as styles } from "@/features/dashboard/newsReaderStyleDefs";

const END_REACHED_THRESHOLD_PX = 24;

export interface MandatoryNewsCopy {
  deletedEmployee: string;
  newsAttachment: string;
  newsConfirmRead: string;
  newsMandatoryHint: string;
  newsMandatoryTitle: string;
  newsOpenAttachment: string;
  newsPdfPreviewError: string;
  newsPdfPreviewLoading: string;
}

interface MandatoryNewsModalProps {
  confirmMessage: string;
  copy: MandatoryNewsCopy;
  isConfirming: boolean;
  isOffline: boolean;
  post: DashboardNewsPost | null;
  userId: number | string;
  onConfirm: (postId: string) => void;
  onOpenAttachment: (post: DashboardNewsPost) => void;
}

interface PdfViewerState {
  baseUri: string;
  fileUri: string;
  postId: string;
}

interface ScrollEvent {
  nativeEvent: {
    contentOffset: { y: number };
    contentSize: { height: number };
    layoutMeasurement: { height: number };
  };
}

/**
 * Blocking "must read" news modal. Owns its scroll/PDF state so reading
 * progress re-renders only this modal, not the whole dashboard.
 */
export function MandatoryNewsModal({
  confirmMessage,
  copy,
  isConfirming,
  isOffline,
  post,
  userId,
  onConfirm,
  onOpenAttachment,
}: MandatoryNewsModalProps) {
  const insets = useSafeAreaInsets();
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState | null>(null);
  const [pdfError, setPdfError] = useState("");
  const postId = post?.id;

  useEffect(() => {
    const attachment = post?.attachment;
    if (!post || !attachment || !isPdfAttachment(post)) {
      setPdfViewer(null);
      setPdfError("");
      return;
    }

    let isCancelled = false;
    setPdfViewer(null);
    setPdfError("");

    void createDashboardNewsPdfViewer(attachment, userId)
      .then((viewer) => {
        if (!isCancelled) setPdfViewer({ ...viewer, postId: post.id });
      })
      .catch(() => {
        if (!isCancelled) setPdfError(copy.newsPdfPreviewError);
      });

    return () => {
      isCancelled = true;
    };
  }, [copy.newsPdfPreviewError, post, userId]);

  useEffect(() => {
    setHasReachedEnd(false);
    setContentHeight(0);
    setViewportHeight(0);
  }, [postId]);

  useEffect(() => {
    if (
      contentHeight > 0 &&
      viewportHeight > 0 &&
      contentHeight <= viewportHeight + END_REACHED_THRESHOLD_PX
    ) {
      setHasReachedEnd(true);
    }
  }, [contentHeight, viewportHeight]);

  const handleScroll = useCallback((event: ScrollEvent): void => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - END_REACHED_THRESHOLD_PX) {
      setHasReachedEnd(true);
    }
  }, []);

  const isConfirmDisabled = isOffline || !hasReachedEnd || isConfirming;

  return (
    <Modal
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={false}
      visible={!!post}
      onRequestClose={() => undefined}
    >
      {post ? (
        <View style={[styles.mandatoryNewsSafeArea, { paddingTop: insets.top }]}>
          <View style={styles.mandatoryNewsHeader}>
            <Text style={styles.mandatoryNewsKicker}>{copy.newsMandatoryTitle}</Text>
            <Text style={styles.mandatoryNewsHint}>{copy.newsMandatoryHint}</Text>
          </View>
          <ScrollView
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={styles.mandatoryNewsScroll}
            contentContainerStyle={styles.mandatoryNewsContent}
            onContentSizeChange={(_width, height) => setContentHeight(height)}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            onScroll={handleScroll}
          >
            <Text style={styles.readerTitle}>{stripDashboardNewsFormatting(post.title)}</Text>
            {post.attachment?.href ? (
              isImageAttachment(post) ? (
                <View style={styles.mandatoryNewsAttachmentPreview}>
                  <RemoteImage
                    cacheKey={`dashboard-news-attachment-${post.attachment.objectKey}`}
                    contentFit="contain"
                    source={{ uri: post.attachment.href }}
                    style={styles.mandatoryNewsAttachmentImage}
                  />
                </View>
              ) : isPdfAttachment(post) ? (
                <View style={styles.mandatoryNewsPdfPreview}>
                  {pdfError ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onOpenAttachment(post)}
                      style={styles.attachmentCard}
                    >
                      <Text style={styles.stateText}>{pdfError}</Text>
                      <Text style={styles.newsReadMore}>{copy.newsOpenAttachment}</Text>
                    </Pressable>
                  ) : pdfViewer?.postId === post.id ? (
                    <WebView
                      allowFileAccess
                      allowFileAccessFromFileURLs
                      allowingReadAccessToURL={pdfViewer.baseUri}
                      bounces
                      mixedContentMode="always"
                      nestedScrollEnabled
                      originWhitelist={["*"]}
                      scalesPageToFit
                      scrollEnabled
                      setBuiltInZoomControls
                      setDisplayZoomControls={false}
                      setSupportMultipleWindows={false}
                      source={{ uri: pdfViewer.fileUri }}
                      style={styles.pdfWebView}
                      onContentProcessDidTerminate={() => setPdfError(copy.newsPdfPreviewError)}
                      onError={() => setPdfError(copy.newsPdfPreviewError)}
                    />
                  ) : (
                    <ZhaoLoadingIndicator label={copy.newsPdfPreviewLoading} />
                  )}
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onOpenAttachment(post)}
                  style={styles.attachmentCard}
                >
                  <View style={styles.attachmentBody}>
                    <Text style={styles.newsMetaText}>{copy.newsAttachment}</Text>
                    <Text style={styles.attachmentName}>{post.attachment.name || "-"}</Text>
                    <Text style={styles.stateText}>
                      {formatAttachmentSize(post.attachment.sizeBytes)}
                    </Text>
                  </View>
                  <Text style={styles.newsReadMore}>{copy.newsOpenAttachment}</Text>
                </Pressable>
              )
            ) : null}
            {isDashboardNewsSummaryDistinct(post.summary, post.body) ? (
              <Text style={styles.readerSummary}>{stripDashboardNewsFormatting(post.summary)}</Text>
            ) : null}
            <View style={styles.readerBody}>
              <NewsReaderBody post={post} />
            </View>
            <View style={styles.readerMetaGrid}>
              <Text style={styles.newsMetaText}>{formatDashboardNewsDate(post.createdAt)}</Text>
              <Text style={styles.newsMetaText}>
                {post.authorName || copy.deletedEmployee} · {post.restaurantName || "-"}
              </Text>
            </View>
          </ScrollView>
          <View
            style={[styles.mandatoryNewsActions, { paddingBottom: Math.max(16, insets.bottom) }]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={isConfirmDisabled}
              style={[
                styles.mandatoryNewsConfirmButton,
                isConfirmDisabled ? styles.mandatoryNewsConfirmButtonDisabled : null,
              ]}
              onPress={() => onConfirm(post.id)}
            >
              <Text style={styles.mandatoryNewsConfirmButtonText}>{copy.newsConfirmRead}</Text>
            </Pressable>
            {confirmMessage ? <Text style={styles.mandatoryNewsHint}>{confirmMessage}</Text> : null}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
