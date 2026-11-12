import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlatformBlurView } from "@/components/PlatformBlurView";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import type { DASHBOARD_COPY } from "@/features/dashboard/dashboardCopy";
import type {
  DashboardNewsPost,
  fetchDashboardNewsReadStatus,
} from "@/features/dashboard/dashboardNewsApi";
import { formatAttachmentSize } from "@/features/dashboard/dashboardNewsAttachment";
import {
  formatDashboardNewsDate,
  isDashboardNewsSummaryDistinct,
  resolveNewsDeskCategory,
  stripDashboardNewsFormatting,
} from "@/features/dashboard/dashboardNewsPresentation";
import { NewsReaderBody } from "@/features/dashboard/NewsReaderBody";
import { newsReaderStyles as styles } from "@/features/dashboard/newsReaderStyleDefs";

export interface NewsReadStatusState {
  postId: string;
  status: Awaited<ReturnType<typeof fetchDashboardNewsReadStatus>> | null;
  error: string;
  isLoading: boolean;
}

export type NewsReaderCopy = Pick<
  (typeof DASHBOARD_COPY)["zh"],
  | "deletedEmployee"
  | "newsAttachment"
  | "newsCategories"
  | "newsConfirmRead"
  | "newsNotRead"
  | "newsOpenAttachment"
  | "newsReadConfirmedAt"
  | "newsReadList"
  | "newsReadProgress"
  | "newsReadStatusLoading"
  | "newsReadTrackingUnavailable"
  | "newsReaderClose"
  | "newsReaderLoading"
  | "newsUnreadList"
  | "newsViewReadDetails"
>;

interface NewsReaderModalProps {
  canViewReadStats: boolean;
  confirmMessage: string;
  confirmingPostId: string;
  copy: NewsReaderCopy;
  error: string;
  isLoading: boolean;
  isOffline: boolean;
  post: DashboardNewsPost | null;
  readStatus: NewsReadStatusState;
  onClose: () => void;
  onConfirm: (postId: string) => void;
  onLoadReadStatus: (postId: string) => void;
  onOpenAttachment: (post: DashboardNewsPost) => void;
}

/** Bottom-sheet reader for a selected news post, including read-confirmation and read stats. */
export function NewsReaderModal({
  canViewReadStats,
  confirmMessage,
  confirmingPostId,
  copy,
  error,
  isLoading,
  isOffline,
  post,
  readStatus,
  onClose,
  onConfirm,
  onLoadReadStatus,
  onOpenAttachment,
}: NewsReaderModalProps) {
  const [readStatusTab, setReadStatusTab] = useState<"read" | "unread">("read");

  return (
    <Modal
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      visible={!!post}
      onRequestClose={onClose}
    >
      <View style={styles.readerModalRoot}>
        <Pressable
          style={styles.readerBackdrop}
          onPress={onClose}
        />
        <SafeAreaView
          edges={["left", "right"]}
          pointerEvents="box-none"
          style={styles.readerSafeArea}
        >
          {post ? (
            <PlatformBlurView intensity={34} tint="light" style={styles.readerSheet}>
              <View style={styles.sheetSurface} />
              <View style={styles.sheetHandle} />
              <View style={styles.newsMetaRow}>
                <Text style={styles.newsMetaText}>
                  {
                    copy.newsCategories[
                      resolveNewsDeskCategory(post.category)
                    ]
                  }
                </Text>
                <Pressable
                  style={styles.readerCloseButton}
                  onPress={onClose}
                >
                  <Text style={styles.sheetCloseText}>
                    {copy.newsReaderClose}
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.readerScroll}
              >
                <Text style={styles.readerTitle}>
                  {stripDashboardNewsFormatting(post.title)}
                </Text>
                {isDashboardNewsSummaryDistinct(
                  post.summary,
                  post.body,
                ) ? (
                  <Text style={styles.readerSummary}>
                    {stripDashboardNewsFormatting(post.summary)}
                  </Text>
                ) : null}
                <View style={styles.readerMetaGrid}>
                  <Text style={styles.newsMetaText}>
                    {formatDashboardNewsDate(post.createdAt)}
                  </Text>
                  <Text style={styles.newsMetaText}>
                    {post.authorName || copy.deletedEmployee} ·{" "}
                    {post.restaurantName || "-"}
                  </Text>
                </View>
                {isLoading ? (
                  <View style={styles.stateRow}>
                    <ZhaoLoadingIndicator label={copy.newsReaderLoading} />
                  </View>
                ) : null}
                {error ? (
                  <Text style={styles.stateText}>{error}</Text>
                ) : null}
                {post.attachment?.href ? (
                  <Pressable
                    style={styles.attachmentCard}
                    onPress={() => onOpenAttachment(post)}
                  >
                    <View style={styles.attachmentBody}>
                      <Text style={styles.newsMetaText}>
                        {copy.newsAttachment}
                      </Text>
                      <Text style={styles.attachmentName}>
                        {post.attachment.name || "-"}
                      </Text>
                      <Text style={styles.stateText}>
                        {formatAttachmentSize(
                          post.attachment.sizeBytes,
                        )}
                      </Text>
                    </View>
                    <Text style={styles.newsReadMore}>
                      {copy.newsOpenAttachment}
                    </Text>
                  </Pressable>
                ) : null}
                <View style={styles.readerBody}>
                  <NewsReaderBody post={post} />
                </View>
                {post.tags.length > 0 ? (
                  <View style={styles.newsTagRow}>
                    {post.tags.map((tag) => (
                      <Text key={tag} style={styles.newsTag}>
                        #{tag}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {post.readConfirmation?.isRequired ? (
                  <View style={styles.readConfirmationCard}>
                    {post.readConfirmation.confirmedAt ? (
                      <Text style={styles.readConfirmationText}>
                        {copy.newsReadConfirmedAt} ·{" "}
                        {formatDashboardNewsDate(
                          post.readConfirmation.confirmedAt,
                        )}
                      </Text>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        disabled={
                          isOffline ||
                          confirmingPostId === post.id
                        }
                        style={[
                          styles.readConfirmationButton,
                          isOffline ? styles.mandatoryNewsConfirmButtonDisabled : null,
                        ]}
                        onPress={() =>
                          onConfirm(post.id)
                        }
                      >
                        <Text style={styles.readConfirmationButtonText}>
                          {copy.newsConfirmRead}
                        </Text>
                      </Pressable>
                    )}
                    {confirmMessage ? (
                      <Text style={styles.readConfirmationText}>
                        {confirmMessage}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {canViewReadStats ? (
                  <View style={styles.readStatusCard}>
                    {post.readSummary ? (
                      <Text style={styles.readConfirmationText}>
                        {copy.newsReadProgress(
                          post.readSummary.readCount,
                          post.readSummary.totalRecipients,
                          post.readSummary.readRate,
                        )}
                      </Text>
                    ) : (
                      <Text style={styles.readConfirmationText}>
                        {copy.newsReadTrackingUnavailable}
                      </Text>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      style={styles.readStatusButton}
                      onPress={() => onLoadReadStatus(post.id)}
                    >
                      <Text style={styles.readStatusButtonText}>
                        {copy.newsViewReadDetails}
                      </Text>
                    </Pressable>
                    {readStatus.postId === post.id ? (
                      <View style={styles.readStatusDetails}>
                        {readStatus.isLoading ? (
                          <Text style={styles.readConfirmationText}>
                            {copy.newsReadStatusLoading}
                          </Text>
                        ) : null}
                        {readStatus.error ? (
                          <Text style={styles.readConfirmationText}>
                            {readStatus.error}
                          </Text>
                        ) : null}
                        {!readStatus.isLoading &&
                        readStatus.status?.isTracked ? (
                          <>
                            <View style={styles.readStatusTabs}>
                              {(
                                [
                                  ["read", copy.newsReadList],
                                  ["unread", copy.newsUnreadList],
                                ] as const
                              ).map(([key, label]) => (
                                <Pressable
                                  key={key}
                                  accessibilityRole="tab"
                                  accessibilityState={{
                                    selected: readStatusTab === key,
                                  }}
                                  style={[
                                    styles.readStatusTab,
                                    readStatusTab === key
                                      ? styles.readStatusTabActive
                                      : null,
                                  ]}
                                  onPress={() => setReadStatusTab(key)}
                                >
                                  <Text
                                    style={[
                                      styles.readStatusTabText,
                                      readStatusTab === key
                                        ? styles.readStatusTabTextActive
                                        : null,
                                    ]}
                                  >
                                    {label}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                            {(readStatusTab === "read"
                              ? readStatus.status.read
                              : readStatus.status.unread
                            ).map((item) => (
                              <View
                                key={item.userId}
                                style={styles.readStatusPerson}
                              >
                                <Text style={styles.readStatusPersonName}>
                                  {item.name || "-"}
                                </Text>
                                <Text style={styles.readStatusPersonMeta}>
                                  {item.restaurantName || "-"} ·{" "}
                                  {item.confirmedAt
                                    ? formatDashboardNewsDate(item.confirmedAt)
                                    : copy.newsNotRead}
                                </Text>
                              </View>
                            ))}
                          </>
                        ) : null}
                        {!readStatus.isLoading &&
                        readStatus.status &&
                        !readStatus.status.isTracked ? (
                          <Text style={styles.readConfirmationText}>
                            {copy.newsReadTrackingUnavailable}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>
            </PlatformBlurView>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
