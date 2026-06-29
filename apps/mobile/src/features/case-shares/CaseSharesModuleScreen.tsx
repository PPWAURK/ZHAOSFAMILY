import { useEffect, useState, type ReactElement } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type {
  CaseShareCommentItem,
  CaseShareItem,
  CaseShareStatus,
  CaseShareType,
} from "@zhao/types";
import { useScreenName } from "@/lib/useScreenName";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { useToast } from "@/components/toast/ToastProvider";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { storeStyles as shared } from "@/features/stores/storeStyles";
import {
  buildCaseImageUrl,
  createCaseComment,
  createCaseShare,
  deleteCaseShare,
  fetchCaseComments,
  fetchMyCaseShares,
  fetchPublicCaseShares,
  likeCaseShare,
  unlikeCaseShare,
  uploadCaseImage,
  type CaseImageUpload,
} from "@/features/case-shares/caseSharesApi";
import { CASE_SHARES_COPY } from "@/features/case-shares/caseSharesCopy";

type CaseSharesModuleScreenProps = {
  language: AuthLanguage;
};

type CaseTab = "feed" | "mine";

const CASE_TYPES: CaseShareType[] = ["personal", "team"];

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function assetToUpload(
  asset: ImagePicker.ImagePickerAsset,
): CaseImageUpload | null {
  if (!asset.uri) {
    return null;
  }

  const fallbackName = asset.uri.split("/").pop() || `case-${Date.now()}.jpg`;

  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type: asset.mimeType || "image/jpeg",
  };
}

export function CaseSharesModuleScreen({
  language,
}: CaseSharesModuleScreenProps) {
  useScreenName("case-shares");
  const copy = CASE_SHARES_COPY[language];
  const confirm = useConfirm();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<CaseTab>("feed");
  const [feed, setFeed] = useState<CaseShareItem[]>([]);
  const [mine, setMine] = useState<CaseShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<CaseShareType>("personal");
  const [composerContent, setComposerContent] = useState("");
  const [composerImage, setComposerImage] = useState<CaseImageUpload | null>(
    null,
  );
  const [composerError, setComposerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [likingId, setLikingId] = useState<number | null>(null);

  const [commentsCase, setCommentsCase] = useState<CaseShareItem | null>(null);
  const [comments, setComments] = useState<CaseShareCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setLoadError("");

      try {
        const [feedResult, mineResult] = await Promise.all([
          fetchPublicCaseShares(),
          fetchMyCaseShares(),
        ]);

        if (isCancelled) return;

        setFeed(feedResult.items);
        setMine(mineResult.items);
      } catch {
        if (!isCancelled) {
          setLoadError(copy.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [copy.loadError]);

  function openComposer(): void {
    setComposerType("personal");
    setComposerContent("");
    setComposerImage(null);
    setComposerError("");
    setComposerOpen(true);
  }

  async function handlePickImage(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setComposerError(copy.imagePermission);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const upload = assetToUpload(result.assets[0]);

    if (upload) {
      setComposerError("");
      setComposerImage(upload);
    }
  }

  async function handleSubmit(): Promise<void> {
    const content = composerContent.trim();

    if (!content) {
      setComposerError(copy.contentRequired);
      return;
    }

    setIsSubmitting(true);
    setComposerError("");

    try {
      const uploaded = composerImage
        ? await uploadCaseImage(composerImage)
        : null;

      const created = await createCaseShare({
        type: composerType,
        content,
        ...(uploaded
          ? {
              imageBucket: uploaded.bucket,
              imageObjectKey: uploaded.objectKey,
              imageName: uploaded.originalName,
              imageMimeType: uploaded.mimeType,
              imageSizeBytes: uploaded.size,
            }
          : {}),
      });

      setMine((current) => [created, ...current]);
      setComposerOpen(false);
      setActiveTab("mine");
      toast.success(copy.submitSuccess);
    } catch (error) {
      const isUpload = composerImage && !(error instanceof Error);
      setComposerError(isUpload ? copy.uploadError : copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: CaseShareItem): Promise<void> {
    const confirmed = await confirm({
      title: copy.deleteTitle,
      message: copy.deleteBody,
      confirmLabel: copy.deleteConfirm,
      cancelLabel: copy.deleteCancel,
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);

    try {
      await deleteCaseShare(item.id);
      setMine((current) => current.filter((entry) => entry.id !== item.id));
      toast.success(copy.deleteSuccess);
    } catch {
      toast.error(copy.deleteError);
    } finally {
      setDeletingId(null);
    }
  }

  function applyUpdatedItem(updated: CaseShareItem): void {
    const replace = (list: CaseShareItem[]) =>
      list.map((entry) => (entry.id === updated.id ? updated : entry));
    setFeed(replace);
    setMine(replace);
    setCommentsCase((current) =>
      current && current.id === updated.id ? updated : current,
    );
  }

  async function handleToggleLike(item: CaseShareItem): Promise<void> {
    setLikingId(item.id);

    try {
      const updated = item.likedByCurrentUser
        ? await unlikeCaseShare(item.id)
        : await likeCaseShare(item.id);
      applyUpdatedItem(updated);
    } catch {
      toast.error(copy.likeError);
    } finally {
      setLikingId(null);
    }
  }

  async function openComments(item: CaseShareItem): Promise<void> {
    setCommentsCase(item);
    setComments([]);
    setCommentInput("");
    setCommentsError("");
    setCommentsLoading(true);

    try {
      setComments(await fetchCaseComments(item.id));
    } catch {
      setCommentsError(copy.commentsLoadError);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleSendComment(): Promise<void> {
    if (!commentsCase) {
      return;
    }

    const content = commentInput.trim();

    if (!content) {
      setCommentsError(copy.commentRequired);
      return;
    }

    setIsSendingComment(true);
    setCommentsError("");

    try {
      const created = await createCaseComment(commentsCase.id, content);
      setComments((current) => [...current, created]);
      setCommentInput("");
      applyUpdatedItem({
        ...commentsCase,
        commentCount: commentsCase.commentCount + 1,
      });
    } catch {
      setCommentsError(copy.commentError);
    } finally {
      setIsSendingComment(false);
    }
  }

  function renderCard(item: CaseShareItem, showStatus: boolean): ReactElement {
    return (
      <View key={item.id} style={shared.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.typeBadge}>{copy.typeLabels[item.type]}</Text>
          {showStatus ? (
            <Text style={[styles.statusBadge, statusBadgeStyle(item.status)]}>
              {copy.statusLabels[item.status]}
            </Text>
          ) : null}
        </View>

        <Text style={shared.cardMeta}>
          {item.author.name} · {item.restaurant.name} ·{" "}
          {formatDate(item.createdAt)}
        </Text>

        <Text style={styles.cardContent}>{item.content}</Text>

        {item.image ? (
          <Image
            resizeMode="cover"
            source={{ uri: buildCaseImageUrl(item.image.objectKey) }}
            style={styles.cardImage}
          />
        ) : null}

        {item.status === "approved" ? (
          <View style={styles.interactionBar}>
            <Pressable
              disabled={likingId === item.id}
              style={styles.interactionButton}
              onPress={() => void handleToggleLike(item)}
            >
              <Ionicons
                color={authControlStyles.colors.red}
                name={item.likedByCurrentUser ? "heart" : "heart-outline"}
                size={18}
              />
              <Text style={styles.interactionText}>
                {copy.like} · {item.likeCount}
              </Text>
            </Pressable>
            <Pressable
              style={styles.interactionButton}
              onPress={() => void openComments(item)}
            >
              <Ionicons
                color={authControlStyles.colors.ink60}
                name="chatbubble-outline"
                size={18}
              />
              <Text style={styles.interactionText}>
                {copy.comment} · {item.commentCount}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {showStatus && item.status === "rejected" && item.reviewNote ? (
          <Text style={shared.cardMeta}>
            {copy.reviewNoteLabel}: {item.reviewNote}
          </Text>
        ) : null}

        {showStatus && item.canDelete ? (
          <Pressable
            disabled={deletingId === item.id}
            style={[shared.actionButton, styles.deleteButton]}
            onPress={() => void handleDelete(item)}
          >
            <Text style={shared.actionButtonText}>
              {deletingId === item.id ? copy.deleting : copy.delete}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const visibleList = activeTab === "feed" ? feed : mine;
  const emptyText = activeTab === "feed" ? copy.feedEmpty : copy.mineEmpty;

  return (
    <View style={shared.container}>
      <View style={shared.header}>
        <TrackingText color={authControlStyles.colors.red} size={10.5}>
          {copy.kicker}
        </TrackingText>
        <Text style={shared.title}>
          {copy.title}
          <Text style={shared.titleAccent}>{copy.titleAccent}</Text>
        </Text>
        <Text style={shared.hint}>{copy.intro}</Text>
      </View>

      <Pressable
        style={[shared.actionButton, shared.actionButtonPrimary]}
        onPress={openComposer}
      >
        <Text style={[shared.actionButtonText, shared.actionButtonTextPrimary]}>
          {copy.publish}
        </Text>
      </Pressable>

      <View style={shared.filterScrollerContent}>
        {(["feed", "mine"] as CaseTab[]).map((tab) => {
          const isActive = activeTab === tab;

          return (
            <Pressable
              key={tab}
              style={[shared.filterPill, isActive ? shared.filterPillActive : null]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  shared.filterPillText,
                  isActive ? shared.filterPillTextActive : null,
                ]}
              >
                {tab === "feed" ? copy.tabFeed : copy.tabMine}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}

      {!isLoading && loadError ? (
        <Text style={shared.message}>{loadError}</Text>
      ) : null}

      {!isLoading && !loadError && visibleList.length === 0 ? (
        <Text style={shared.emptyText}>{emptyText}</Text>
      ) : null}

      {!isLoading && !loadError && visibleList.length > 0 ? (
        <View style={shared.list}>
          {visibleList.map((item) => renderCard(item, activeTab === "mine"))}
        </View>
      ) : null}

      <Modal
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        visible={composerOpen}
        onRequestClose={() => setComposerOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setComposerOpen(false)}
          />
          <View style={styles.modalSheet}>
            <View style={shared.sectionHeader}>
              <Text style={shared.sectionTitle}>{copy.composerTitle}</Text>
              <Pressable onPress={() => setComposerOpen(false)}>
                <Text style={shared.actionButtonText}>{copy.cancel}</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={shared.statLabel}>{copy.typeLabel}</Text>
              <View style={shared.roleGrid}>
                {CASE_TYPES.map((type) => {
                  const isActive = composerType === type;

                  return (
                    <Pressable
                      key={type}
                      style={[
                        shared.rolePill,
                        isActive ? shared.rolePillActive : null,
                      ]}
                      onPress={() => setComposerType(type)}
                    >
                      <Text
                        style={[
                          shared.rolePillText,
                          isActive ? shared.rolePillTextActive : null,
                        ]}
                      >
                        {copy.typeLabels[type]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[shared.statLabel, styles.fieldSpacing]}>
                {copy.contentLabel}
              </Text>
              <TextInput
                multiline
                placeholder={copy.contentPlaceholder}
                placeholderTextColor={authControlStyles.colors.ink40}
                style={[shared.searchInput, styles.contentInput]}
                textAlignVertical="top"
                value={composerContent}
                onChangeText={(value) => {
                  setComposerError("");
                  setComposerContent(value);
                }}
              />

              <Text style={[shared.statLabel, styles.fieldSpacing]}>
                {copy.imageLabel}
              </Text>
              {composerImage ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: composerImage.uri }}
                  style={styles.composerImage}
                />
              ) : null}
              <View style={shared.actionRow}>
                <Pressable
                  style={shared.actionButton}
                  onPress={() => void handlePickImage()}
                >
                  <Text style={shared.actionButtonText}>
                    {composerImage ? copy.imageReplace : copy.imagePick}
                  </Text>
                </Pressable>
                {composerImage ? (
                  <Pressable
                    style={shared.actionButton}
                    onPress={() => setComposerImage(null)}
                  >
                    <Text style={shared.actionButtonText}>
                      {copy.imageRemove}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {composerError ? (
                <Text style={[shared.message, styles.fieldSpacing]}>
                  {composerError}
                </Text>
              ) : null}

              <Pressable
                disabled={isSubmitting}
                style={[
                  shared.actionButton,
                  shared.actionButtonPrimary,
                  styles.fieldSpacing,
                ]}
                onPress={() => void handleSubmit()}
              >
                <Text
                  style={[
                    shared.actionButtonText,
                    shared.actionButtonTextPrimary,
                  ]}
                >
                  {isSubmitting ? copy.submitting : copy.submit}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        visible={!!commentsCase}
        onRequestClose={() => setCommentsCase(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setCommentsCase(null)}
          />
          <View style={styles.modalSheet}>
            <View style={shared.sectionHeader}>
              <Text style={shared.sectionTitle}>{copy.commentsTitle}</Text>
              <Pressable onPress={() => setCommentsCase(null)}>
                <Text style={shared.actionButtonText}>{copy.cancel}</Text>
              </Pressable>
            </View>

            {commentsLoading ? (
              <ZhaoLoadingIndicator label={copy.loading} />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.commentsScroll}
              >
                {comments.length === 0 ? (
                  <Text style={shared.emptyText}>{copy.commentsEmpty}</Text>
                ) : (
                  comments.map((entry) => (
                    <View key={entry.id} style={styles.commentRow}>
                      <Text style={styles.commentAuthor}>
                        {entry.author.name}
                      </Text>
                      <Text style={styles.commentContent}>{entry.content}</Text>
                      <Text style={shared.statLabel}>
                        {formatDate(entry.createdAt)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {commentsError ? (
              <Text style={shared.message}>{commentsError}</Text>
            ) : null}

            <View style={styles.commentComposer}>
              <TextInput
                multiline
                placeholder={copy.commentPlaceholder}
                placeholderTextColor={authControlStyles.colors.ink40}
                style={[shared.searchInput, styles.commentInput]}
                value={commentInput}
                onChangeText={(value) => {
                  setCommentsError("");
                  setCommentInput(value);
                }}
              />
              <Pressable
                disabled={isSendingComment}
                style={[
                  shared.actionButton,
                  shared.actionButtonPrimary,
                  styles.commentSend,
                ]}
                onPress={() => void handleSendComment()}
              >
                <Text
                  style={[
                    shared.actionButtonText,
                    shared.actionButtonTextPrimary,
                  ]}
                >
                  {isSendingComment ? copy.commentSending : copy.commentSend}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function statusBadgeStyle(status: CaseShareStatus): { color: string } {
  if (status === "approved") return { color: "#1f8a4c" };
  if (status === "rejected") return { color: authControlStyles.colors.red };

  return { color: authControlStyles.colors.ink60 };
}

const styles = StyleSheet.create({
  cardContent: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 23,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardImage: {
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    height: 200,
    width: "100%",
  },
  composerImage: {
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    height: 180,
    marginBottom: 10,
    width: "100%",
  },
  commentAuthor: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 14,
    fontWeight: "700",
  },
  commentComposer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
  },
  commentContent: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 22,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    paddingTop: 12,
  },
  commentRow: {
    borderBottomColor: authControlStyles.colors.ink10,
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 12,
  },
  commentSend: {
    flex: 0,
    paddingHorizontal: 16,
  },
  commentsScroll: {
    maxHeight: 360,
  },
  contentInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  interactionBar: {
    borderTopColor: authControlStyles.colors.ink10,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 20,
    paddingTop: 12,
  },
  interactionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  interactionText: {
    color: authControlStyles.colors.ink60,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  deleteButton: {
    alignSelf: "flex-start",
    flex: 0,
    paddingHorizontal: 18,
  },
  fieldSpacing: {
    marginTop: 14,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 10, 0.28)",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: authControlStyles.colors.paper,
    borderTopColor: authControlStyles.colors.red,
    borderTopWidth: 3,
    gap: 12,
    maxHeight: "88%",
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  statusBadge: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  typeBadge: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
