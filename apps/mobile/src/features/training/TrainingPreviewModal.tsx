import { useEffect, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import type { TRAINING_COPY } from "@/features/training/trainingCopy";
import {
  assessViewerStats,
  IMAGE_MIN_VIEW_SECONDS,
  pdfMinReadSeconds,
  VIDEO_COMPLETION_WATCHED_PCT,
  type ViewerStats,
} from "@/features/training/trainingProgressRules";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import {
  isImageMaterial,
  isPdfMaterial,
  isVideoMaterial,
  parseViewerMessage,
} from "@/features/training/trainingViewer";
import type {
  TrainingMaterialProgress,
  TrainingPlanMaterial,
  UpdateTrainingProgressInput,
} from "@/features/training/trainingTypes";

const PROGRESS_SYNC_STEP_PCT = 10;

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingPreviewModalProps = {
  copy: TrainingCopySet;
  material: TrainingPlanMaterial | null;
  fileUri: string;
  baseUri: string;
  isLoading: boolean;
  errorMessage: string;
  onClose: () => void;
  onRetry: () => void;
  onWebViewLoadEnd: () => void;
  onWebViewError: () => void;
  onStartQuiz: (material: TrainingPlanMaterial) => void;
  syncProgress: (
    materialId: number,
    input: UpdateTrainingProgressInput,
  ) => Promise<TrainingMaterialProgress | null>;
};

function getMarkCompleteHint(
  copy: TrainingCopySet,
  material: TrainingPlanMaterial,
): string {
  if (isVideoMaterial(material)) return copy.markCompleteHintVideo;
  if (isPdfMaterial(material)) return copy.markCompleteHintPdf;

  return copy.markCompleteHintImage;
}

function formatTemplate(
  template: string,
  values: Record<string, number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

// Live tracking feedback so a disabled button never looks broken.
function getTrackingStatus(
  copy: TrainingCopySet,
  stats: ViewerStats | null,
): string | null {
  if (!stats) return null;

  if (stats.kind === "video") {
    return formatTemplate(copy.trackingVideo, {
      watched: stats.watchedPct,
      required: VIDEO_COMPLETION_WATCHED_PCT,
    });
  }

  if (stats.kind === "pdf") {
    return formatTemplate(copy.trackingPdf, {
      maxPage: stats.maxPage,
      numPages: stats.numPages,
      readSeconds: stats.readSeconds,
      requiredSeconds: pdfMinReadSeconds(stats.numPages),
    });
  }

  return formatTemplate(copy.trackingImage, {
    seconds: stats.viewedSeconds,
    required: IMAGE_MIN_VIEW_SECONDS,
  });
}

export function TrainingPreviewModal({
  copy,
  material,
  fileUri,
  baseUri,
  isLoading,
  errorMessage,
  onClose,
  onRetry,
  onWebViewLoadEnd,
  onWebViewError,
  onStartQuiz,
  syncProgress,
}: TrainingPreviewModalProps) {
  const confirm = useConfirm();
  const [stats, setStats] = useState<ViewerStats | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [hasSyncFailed, setHasSyncFailed] = useState(false);
  const lastSyncedPctRef = useRef(0);
  const latestPctRef = useRef(0);

  const materialId = material?.id ?? null;
  const hasQuiz = material?.hasQuiz ?? false;
  const assessment = stats ? assessViewerStats(stats) : null;
  // Quiz-gated materials are completed by passing the quiz, not by viewing —
  // the viewer threshold only unlocks the "start quiz" action.
  const viewedEnough = assessment?.canMarkComplete ?? false;
  const canShowPreview = Boolean(material && fileUri);
  const shouldShowImagePreview = canShowPreview && isImageMaterial(material);
  const shouldShowWebPreview = canShowPreview && !shouldShowImagePreview;

  useEffect(() => {
    setStats(null);
    setIsCompleted(material?.progress.status === "completed");
    setIsMarking(false);
    setHasSyncFailed(false);
    lastSyncedPctRef.current = material?.progress.progressPct ?? 0;
    latestPctRef.current = material?.progress.progressPct ?? 0;
    // The completion session restarts whenever another material is opened.
  }, [materialId]);

  // Images and any material without an instrumented viewer (e.g. articles)
  // fall back to dwell-time tracking so they always have a completion path.
  const usesDwellTracking =
    canShowPreview && !isVideoMaterial(material) && !isPdfMaterial(material);

  useEffect(() => {
    if (!usesDwellTracking || isCompleted) return;

    const timer = setInterval(() => {
      setStats((previous) => ({
        kind: "image",
        viewedSeconds:
          previous?.kind === "image" ? previous.viewedSeconds + 1 : 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [usesDwellTracking, isCompleted, materialId]);

  async function completeMaterial(): Promise<void> {
    if (materialId === null || isMarking || isCompleted) return;

    setIsMarking(true);
    const progress = await syncProgress(materialId, { status: "completed" });

    if (progress?.status === "completed") {
      setIsCompleted(true);
      setHasSyncFailed(false);
    } else if (progress) {
      // Backend kept it in_progress (e.g. a quiz still gates completion) —
      // don't fake a completed state the server didn't grant.
      setHasSyncFailed(false);
    } else {
      setHasSyncFailed(true);
    }

    setIsMarking(false);
  }

  useEffect(() => {
    if (!assessment || materialId === null || isCompleted) return;

    if (assessment.progressPct > latestPctRef.current) {
      latestPctRef.current = assessment.progressPct;
    }

    if (assessment.shouldAutoComplete && !hasQuiz) {
      void completeMaterial();
      return;
    }

    if (
      assessment.progressPct >=
      lastSyncedPctRef.current + PROGRESS_SYNC_STEP_PCT
    ) {
      const syncedPct = assessment.progressPct;
      void syncProgress(materialId, {
        status: "in_progress",
        progressPct: syncedPct,
      }).then((progress) => {
        if (progress) {
          lastSyncedPctRef.current = Math.max(
            lastSyncedPctRef.current,
            syncedPct,
          );
          setHasSyncFailed(false);
        } else {
          setHasSyncFailed(true);
        }
      });
    }
    // Only viewer stats updates should re-trigger the sync pipeline.
  }, [stats]);

  async function handleMarkCompletePress(): Promise<void> {
    const confirmed = await confirm({
      title: copy.markCompleteConfirmTitle,
      message: copy.markCompleteConfirmMessage,
      confirmLabel: copy.markCompleteConfirmOk,
      cancelLabel: copy.markCompleteConfirmCancel,
    });
    if (confirmed) {
      void completeMaterial();
    }
  }

  function handleClose(): void {
    // Best-effort flush so progress survives even if periodic syncs failed.
    if (
      materialId !== null &&
      !isCompleted &&
      latestPctRef.current > lastSyncedPctRef.current
    ) {
      void syncProgress(materialId, {
        status: "in_progress",
        progressPct: latestPctRef.current,
      });
    }

    onClose();
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      visible={!!material}
      onRequestClose={handleClose}
    >
      <View style={styles.previewModalRoot}>
        <SafeAreaView edges={["bottom"]} style={styles.previewPanel}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleGroup}>
              <Text style={styles.cardMeta}>{material?.positionId || "-"}</Text>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {material?.title || "-"}
              </Text>
            </View>
            <Pressable style={styles.previewCloseButton} onPress={handleClose}>
              <Text style={styles.refreshButtonText}>{copy.close}</Text>
            </Pressable>
          </View>
          <View style={styles.previewBody}>
            {shouldShowImagePreview ? (
              <Image
                resizeMode="contain"
                source={{ uri: fileUri }}
                style={styles.previewImage}
              />
            ) : null}
            {shouldShowWebPreview ? (
              <WebView
                allowFileAccess
                allowFileAccessFromFileURLs
                allowingReadAccessToURL={baseUri || fileUri}
                allowsFullscreenVideo
                allowsInlineMediaPlayback={Platform.OS === "ios"}
                mediaPlaybackRequiresUserAction={false}
                mixedContentMode="always"
                originWhitelist={["*"]}
                source={{ uri: fileUri }}
                startInLoadingState
                style={styles.previewWebView}
                onLoadEnd={onWebViewLoadEnd}
                onError={onWebViewError}
                onMessage={(event) => {
                  const message = parseViewerMessage(event.nativeEvent.data);
                  if (message) setStats(message);
                }}
              />
            ) : null}
            {isLoading ? (
              <View style={styles.previewOverlay}>
                <ZhaoLoadingIndicator
                  label={copy.previewLoading}
                  variant="overlay"
                />
              </View>
            ) : null}
            {errorMessage ? (
              <View style={styles.previewOverlay}>
                <Text style={styles.message}>{errorMessage}</Text>
                <Pressable style={styles.refreshButton} onPress={onRetry}>
                  <Text style={styles.refreshButtonText}>{copy.retry}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          {material && !errorMessage ? (
            <View style={styles.previewFooter}>
              {hasQuiz ? (
                <>
                  {isCompleted ? (
                    <Text style={styles.completedBadgeText}>
                      ✓ {copy.statuses.completed}
                    </Text>
                  ) : null}
                  <Pressable
                    style={styles.markCompleteButton}
                    onPress={() => onStartQuiz(material)}
                  >
                    <Text style={styles.markCompleteButtonText}>
                      {isCompleted ? copy.reviewQuiz : copy.startQuiz}
                    </Text>
                  </Pressable>
                  {!isCompleted ? (
                    <Text style={styles.markCompleteHint}>
                      {viewedEnough
                        ? copy.quizGateReady
                        : (getTrackingStatus(copy, stats) ?? copy.quizGateHint)}
                    </Text>
                  ) : null}
                </>
              ) : isCompleted ? (
                <Text style={styles.completedBadgeText}>
                  ✓ {copy.statuses.completed}
                </Text>
              ) : (
                <>
                  <Pressable
                    disabled={!assessment?.canMarkComplete || isMarking}
                    style={[
                      styles.markCompleteButton,
                      !assessment?.canMarkComplete || isMarking
                        ? styles.markCompleteButtonDisabled
                        : null,
                    ]}
                    onPress={() => void handleMarkCompletePress()}
                  >
                    <Text style={styles.markCompleteButtonText}>
                      {copy.markComplete}
                    </Text>
                  </Pressable>
                  {!assessment?.canMarkComplete ? (
                    <Text style={styles.markCompleteHint}>
                      {getTrackingStatus(copy, stats) ??
                        getMarkCompleteHint(copy, material)}
                    </Text>
                  ) : null}
                  {hasSyncFailed ? (
                    <Text style={styles.syncFailedText}>
                      {copy.progressSyncFailed}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
