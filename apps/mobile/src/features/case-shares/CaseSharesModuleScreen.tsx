import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  mode?: "public" | "mine";
  onRegisterPublishAction?: (action: (() => void) | null) => void;
  onOpenMyCases?: () => void;
};

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
  mode = "public",
  onRegisterPublishAction,
  onOpenMyCases,
}: CaseSharesModuleScreenProps) {
  useScreenName("case-shares");
  const copy = CASE_SHARES_COPY[language];
  const confirm = useConfirm();
  const toast = useToast();

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
  const [isPickingImage, setIsPickingImage] = useState(false);
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

  const openComposer = useCallback((): void => {
    setComposerType("personal");
    setComposerContent("");
    setComposerImage(null);
    setComposerError("");
    setIsPickingImage(false);
    setComposerOpen(true);
  }, []);

  useEffect(() => {
    if (!onRegisterPublishAction) {
      return undefined;
    }

    onRegisterPublishAction(openComposer);

    return () => {
      onRegisterPublishAction(null);
    };
  }, [onRegisterPublishAction, openComposer]);

  useEffect(() => {
    function handleAppStateChange(nextAppState: AppStateStatus): void {
      if (nextAppState === "active") {
        setIsPickingImage(false);
      }
    }

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  async function handlePickImage(): Promise<void> {
    if (isPickingImage) {
      return;
    }

    setIsPickingImage(true);
    setComposerError("");

    try {
      const currentPermission =
        await ImagePicker.getMediaLibraryPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setComposerError(copy.imagePermission);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ["images"],
        quality: 0.65,
      });

      if (result.canceled) {
        return;
      }

      const upload = assetToUpload(result.assets[0]);

      if (upload) {
        setComposerImage(upload);
      }
    } finally {
      setIsPickingImage(false);
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
      onOpenMyCases?.();
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
      <View key={item.id} style={styles.caseCard}>
        <View style={styles.caseCardHeader}>
          <View style={styles.authorMark}>
            <Text style={styles.authorMarkText}>
              {item.author.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName} numberOfLines={1}>
              {item.author.name}
            </Text>
            <Text style={styles.restaurantMeta} numberOfLines={1}>
              {item.restaurant.name} · {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={styles.badgeColumn}>
            <Text style={styles.typeBadge}>{copy.typeLabels[item.type]}</Text>
            {showStatus ? (
              <Text style={[styles.statusBadge, statusBadgeStyle(item.status)]}>
                {copy.statusLabels[item.status]}
              </Text>
            ) : null}
          </View>
        </View>

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

  const isMineMode = mode === "mine";
  const visibleList = isMineMode ? mine : feed;
  const emptyText = isMineMode ? copy.mineEmpty : copy.feedEmpty;
  const title = isMineMode ? copy.mineTitle : copy.title;
  const intro = isMineMode ? copy.mineIntro : copy.intro;

  return (
    <View
      style={[
        shared.container,
        styles.screen,
        onRegisterPublishAction ? null : styles.screenWithFloatingButton,
      ]}
    >
      <View style={styles.hero}>
        <View style={styles.kickerRow}>
          <View style={styles.kickerDot} />
          <TrackingText color={authControlStyles.colors.red} size={10.5}>
            {copy.kicker}
          </TrackingText>
        </View>
        <Text style={styles.heroTitle}>
          {title}
          <Text style={styles.heroTitleAccent}>{copy.titleAccent}</Text>
        </Text>
        <Text style={styles.heroIntro}>{intro}</Text>
      </View>

      {isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}

      {!isLoading && loadError ? (
        <Text style={shared.message}>{loadError}</Text>
      ) : null}

      {!isLoading && !loadError && visibleList.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconFrame}>
            <Ionicons
              color={authControlStyles.colors.red}
              name="reader-outline"
              size={24}
            />
          </View>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : null}

      {!isLoading && !loadError && visibleList.length > 0 ? (
        <View style={shared.list}>
          {visibleList.map((item) => renderCard(item, isMineMode))}
        </View>
      ) : null}

      {!onRegisterPublishAction ? (
        <Pressable
          accessibilityLabel={copy.publish}
          accessibilityRole="button"
          style={styles.floatingPublishButton}
          onPress={openComposer}
        >
          <Ionicons color="#ffffff" name="add" size={30} />
        </Pressable>
      ) : null}

      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={composerOpen}
        onRequestClose={() => setComposerOpen(false)}
      >
        <SafeAreaView style={styles.composerPage}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.composerKeyboardView}
          >
            <View style={styles.composerNav}>
              <Pressable
                accessibilityLabel={copy.cancel}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.composerCloseButton,
                  pressed ? styles.composerCloseButtonPressed : null,
                ]}
                onPress={() => setComposerOpen(false)}
              >
                <Ionicons
                  color={authControlStyles.colors.red}
                  name="close"
                  size={22}
                />
              </Pressable>
              <Text style={styles.composerNavTitle}>{copy.publish}</Text>
              <View style={styles.composerNavSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.composerScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.composerHero}>
                <TrackingText color={authControlStyles.colors.red} size={10.5}>
                  {copy.kicker}
                </TrackingText>
                <Text style={styles.composerTitle}>{copy.composerTitle}</Text>
                <Text style={styles.composerIntro}>{copy.composerIntro}</Text>
              </View>

              <View style={styles.composerSection}>
                <Text style={styles.composerLabel}>{copy.typeLabel}</Text>
                <View style={styles.typeChoiceGrid}>
                  {CASE_TYPES.map((type) => {
                    const isActive = composerType === type;

                    return (
                      <Pressable
                        key={type}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        style={[
                          styles.typeChoice,
                          isActive ? styles.typeChoiceActive : null,
                        ]}
                        onPress={() => setComposerType(type)}
                      >
                        <View
                          style={[
                            styles.typeChoiceIcon,
                            isActive ? styles.typeChoiceIconActive : null,
                          ]}
                        >
                          <Ionicons
                            color={
                              isActive
                                ? "#ffffff"
                                : authControlStyles.colors.red
                            }
                            name={
                              type === "personal"
                                ? "person-outline"
                                : "people-outline"
                            }
                            size={20}
                          />
                        </View>
                        <Text
                          style={[
                            styles.typeChoiceText,
                            isActive ? styles.typeChoiceTextActive : null,
                          ]}
                        >
                          {copy.typeLabels[type]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.composerSection}>
                <View style={styles.composerFieldHeader}>
                  <Text style={styles.composerLabel}>{copy.contentLabel}</Text>
                  <Text style={styles.contentCounter}>
                    {composerContent.trim().length}
                  </Text>
                </View>
                <TextInput
                  multiline
                  placeholder={copy.contentPlaceholder}
                  placeholderTextColor={authControlStyles.colors.ink40}
                  style={styles.composerTextInput}
                  textAlignVertical="top"
                  value={composerContent}
                  onChangeText={(value) => {
                    setComposerError("");
                    setComposerContent(value);
                  }}
                />
              </View>

              <View style={styles.composerSection}>
                <Text style={styles.composerLabel}>{copy.imageLabel}</Text>
                {composerImage ? (
                  <View style={styles.imagePreviewFrame}>
                    <Image
                      resizeMode="cover"
                      source={{ uri: composerImage.uri }}
                      style={styles.composerImage}
                    />
                    <View style={styles.imagePreviewActions}>
                      <Pressable
                        disabled={isPickingImage}
                        style={styles.imageActionButton}
                        onPress={() => void handlePickImage()}
                      >
                        <Ionicons
                          color={authControlStyles.colors.red}
                          name="image-outline"
                          size={16}
                        />
                        <Text style={styles.imageActionText}>
                          {isPickingImage ? copy.loading : copy.imageReplace}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.imageActionButton}
                        onPress={() => setComposerImage(null)}
                      >
                        <Ionicons
                          color={authControlStyles.colors.red}
                          name="trash-outline"
                          size={16}
                        />
                        <Text style={styles.imageActionText}>
                          {copy.imageRemove}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isPickingImage}
                    style={[
                      styles.imageEmptyUpload,
                      isPickingImage ? styles.imageUploadDisabled : null,
                    ]}
                    onPress={() => void handlePickImage()}
                  >
                    <View style={styles.imageEmptyIcon}>
                      <Ionicons
                        color={authControlStyles.colors.red}
                        name="camera-outline"
                        size={26}
                      />
                    </View>
                    <Text style={styles.imageEmptyTitle}>
                      {isPickingImage ? copy.loading : copy.imagePick}
                    </Text>
                    <Text style={styles.imageEmptyHint}>
                      {copy.imageEmptyHint}
                    </Text>
                  </Pressable>
                )}
              </View>

              {composerError ? (
                <View style={styles.composerErrorBox}>
                  <Ionicons
                    color={authControlStyles.colors.red}
                    name="alert-circle-outline"
                    size={18}
                  />
                  <Text style={styles.composerErrorText}>{composerError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.composerFooter}>
              <Pressable
                disabled={isSubmitting}
                style={[
                  styles.composerSubmitButton,
                  isSubmitting ? styles.composerSubmitButtonDisabled : null,
                ]}
                onPress={() => void handleSubmit()}
              >
                <Text style={styles.composerSubmitText}>
                  {isSubmitting ? copy.submitting : copy.submit}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
  authorInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  authorMark: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.08)",
    borderColor: "rgba(193, 22, 22, 0.2)",
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  authorMarkText: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 17,
    fontWeight: "700",
  },
  authorName: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 21,
  },
  badgeColumn: {
    alignItems: "flex-end",
    gap: 5,
    maxWidth: 104,
  },
  cardContent: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 16,
    lineHeight: 25,
  },
  cardImage: {
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    borderRadius: 6,
    height: 200,
    width: "100%",
  },
  caseCard: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  caseCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  composerCloseButton: {
    alignItems: "center",
    borderColor: "rgba(193, 22, 22, 0.22)",
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  composerCloseButtonPressed: {
    backgroundColor: "rgba(193, 22, 22, 0.08)",
  },
  composerErrorBox: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    borderColor: "rgba(193, 22, 22, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  composerErrorText: {
    color: authControlStyles.colors.red,
    flex: 1,
    fontFamily: "serif",
    fontSize: 14,
    lineHeight: 20,
  },
  composerFieldHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  composerFooter: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderTopColor: "rgba(193, 22, 22, 0.12)",
    borderTopWidth: 1,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  composerHero: {
    gap: 8,
    paddingTop: 8,
  },
  composerIntro: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 22,
  },
  composerImage: {
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    height: 210,
    width: "100%",
  },
  composerKeyboardView: {
    flex: 1,
  },
  composerLabel: {
    color: authControlStyles.colors.ink40,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  composerNav: {
    alignItems: "center",
    borderBottomColor: "rgba(193, 22, 22, 0.12)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  composerNavSpacer: {
    width: 38,
  },
  composerNavTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "700",
  },
  composerPage: {
    backgroundColor: authControlStyles.colors.paper,
    flex: 1,
  },
  composerScrollContent: {
    gap: 22,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  composerSection: {
    gap: 10,
  },
  composerSubmitButton: {
    alignItems: "center",
    backgroundColor: authControlStyles.colors.red,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  composerSubmitButtonDisabled: {
    opacity: 0.64,
  },
  composerSubmitText: {
    color: "#ffffff",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  composerTextInput: {
    backgroundColor: "rgba(10, 10, 10, 0.025)",
    borderColor: "rgba(193, 22, 22, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 17,
    lineHeight: 25,
    minHeight: 190,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  composerTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
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
  contentCounter: {
    color: authControlStyles.colors.ink40,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyIconFrame: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    borderColor: "rgba(193, 22, 22, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  emptyState: {
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    minHeight: 160,
    padding: 18,
  },
  emptyText: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 23,
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
    minHeight: 34,
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
  imageActionButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 46,
  },
  imageActionText: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  imageEmptyHint: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 270,
    textAlign: "center",
  },
  imageEmptyIcon: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.08)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  imageEmptyTitle: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 17,
    fontWeight: "700",
  },
  imageEmptyUpload: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.035)",
    borderColor: "rgba(193, 22, 22, 0.22)",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 9,
    justifyContent: "center",
    minHeight: 178,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  imageUploadDisabled: {
    opacity: 0.7,
  },
  imagePreviewActions: {
    backgroundColor: "#ffffff",
    borderTopColor: "rgba(193, 22, 22, 0.12)",
    borderTopWidth: 1,
    flexDirection: "row",
  },
  imagePreviewFrame: {
    backgroundColor: "rgba(193, 22, 22, 0.04)",
    borderColor: "rgba(193, 22, 22, 0.16)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  floatingPublishButton: {
    alignItems: "center",
    backgroundColor: authControlStyles.colors.red,
    borderColor: "#ffffff",
    borderRadius: 29,
    borderWidth: 2,
    bottom: 24,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    shadowColor: authControlStyles.colors.red,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    width: 58,
    elevation: 6,
  },
  hero: {
    gap: 8,
    paddingRight: 18,
  },
  heroIntro: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 22,
  },
  heroTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 31,
    fontWeight: "600",
    lineHeight: 36,
  },
  heroTitleAccent: {
    color: authControlStyles.colors.red,
    fontStyle: "italic",
    fontWeight: "400",
  },
  kickerDot: {
    backgroundColor: authControlStyles.colors.red,
    height: 5,
    width: 5,
  },
  kickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
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
  restaurantMeta: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 18,
  },
  screen: {
    position: "relative",
  },
  screenWithFloatingButton: {
    minHeight: 590,
    paddingBottom: 112,
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
    textAlign: "right",
    textTransform: "uppercase",
  },
  typeChoice: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.16)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minHeight: 104,
    minWidth: 0,
    padding: 13,
  },
  typeChoiceActive: {
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    borderColor: "rgba(193, 22, 22, 0.46)",
  },
  typeChoiceGrid: {
    flexDirection: "row",
    gap: 10,
  },
  typeChoiceIcon: {
    alignItems: "center",
    borderColor: "rgba(193, 22, 22, 0.2)",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  typeChoiceIconActive: {
    backgroundColor: authControlStyles.colors.red,
    borderColor: authControlStyles.colors.red,
  },
  typeChoiceText: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  typeChoiceTextActive: {
    color: authControlStyles.colors.red,
  },
});
