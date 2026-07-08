import { useEffect, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import type { TRAINING_COPY } from "@/features/training/trainingCopy";
import {
  assessViewerStats,
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
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<ViewerStats | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [hasSyncFailed, setHasSyncFailed] = useState(false);
  const [isConfirmingComplete, setIsConfirmingComplete] = useState(false);
  const lastSyncedPctRef = useRef(0);
  const latestPctRef = useRef(0);

  const materialId = material?.id ?? null;
  const hasQuiz = material?.hasQuiz ?? false;
  const assessment = stats ? assessViewerStats(stats) : null;
  const viewedEnough = assessment?.canMarkComplete ?? false;
  const canShowPreview = Boolean(material && fileUri);
  const shouldShowImagePreview = canShowPreview && isImageMaterial(material);
  const shouldShowWebPreview = canShowPreview && !shouldShowImagePreview;

  const progressPct = Math.min(
    100,
    Math.max(0, material?.progress.progressPct ?? 0),
  );

  useEffect(() => {
    setStats(null);
    setIsCompleted(material?.progress.status === "completed");
    setIsMarking(false);
    setHasSyncFailed(false);
    setIsConfirmingComplete(false);
    lastSyncedPctRef.current = material?.progress.progressPct ?? 0;
    latestPctRef.current = material?.progress.progressPct ?? 0;
  }, [materialId]);

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
  }, [stats]);

  function handleMarkCompletePress(): void {
    setIsConfirmingComplete(true);
  }

  function handleCancelComplete(): void {
    setIsConfirmingComplete(false);
  }

  function handleConfirmComplete(): void {
    setIsConfirmingComplete(false);
    void completeMaterial();
  }

  function handleClose(): void {
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

  function renderFooter(): React.ReactNode {
    if (!material || errorMessage) return null;

    if (isCompleted) {
      return (
        <View style={styles.viewerFooter}>
          <View style={styles.viewerCompletedBadge}>
            <Text style={styles.viewerCompletedText}>
              ✓ {copy.statuses.completed}
            </Text>
          </View>
          {hasQuiz ? (
            <Pressable
              style={styles.markCompleteButton}
              onPress={() => onStartQuiz(material)}
            >
              <Text style={styles.markCompleteButtonText}>{copy.reviewQuiz}</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }

    if (hasQuiz) {
      return (
        <View style={styles.viewerFooter}>
          <Pressable
            style={styles.markCompleteButton}
            onPress={() => onStartQuiz(material)}
          >
            <Text style={styles.markCompleteButtonText}>{copy.startQuiz}</Text>
          </Pressable>
          <Text style={styles.viewerFooterHint}>
            {viewedEnough ? copy.quizGateReady : copy.quizGateHint}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.viewerFooter}>
        <Pressable
          disabled={!assessment?.canMarkComplete || isMarking}
          style={[
            styles.markCompleteButton,
            !assessment?.canMarkComplete || isMarking
              ? styles.markCompleteButtonDisabled
              : null,
          ]}
          onPress={handleMarkCompletePress}
        >
          <Text style={styles.markCompleteButtonText}>
            {copy.markComplete}
          </Text>
        </Pressable>
        {hasSyncFailed ? (
          <Text style={styles.syncFailedText}>{copy.progressSyncFailed}</Text>
        ) : null}
      </View>
    );
  }

  function renderCompleteConfirm(): React.ReactNode {
    if (!isConfirmingComplete) return null;

    return (
      <Pressable
        style={styles.viewerConfirmBackdrop}
        onPress={handleCancelComplete}
      >
        <Pressable style={styles.viewerConfirmCard} onPress={() => {}}>
          <Text style={styles.viewerConfirmTitle}>
            {copy.markCompleteConfirmTitle}
          </Text>
          <Text style={styles.viewerConfirmMessage}>
            {copy.markCompleteConfirmMessage}
          </Text>

          <View style={styles.viewerConfirmActions}>
            <Pressable
              style={[styles.viewerConfirmButton, styles.viewerConfirmCancelButton]}
              onPress={handleCancelComplete}
            >
              <Text style={styles.viewerConfirmCancelText}>
                {copy.markCompleteConfirmCancel}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.viewerConfirmButton, styles.viewerConfirmOkButton]}
              onPress={handleConfirmComplete}
            >
              <Text style={styles.viewerConfirmOkText}>
                {copy.markCompleteConfirmOk}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={!!material}
      onRequestClose={handleClose}
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.viewerRoot, { paddingTop: insets.top }]}
      >
        <View style={styles.viewerHeader}>
          <View style={styles.viewerHeaderTitleGroup}>
            <Text style={styles.viewerHeaderMeta}>
              {material?.positionId || "-"}
            </Text>
            <Text style={styles.viewerHeaderTitle} numberOfLines={2}>
              {material?.title || "-"}
            </Text>
          </View>
          <Pressable style={styles.previewCloseButton} onPress={handleClose}>
            <Text style={styles.refreshButtonText}>{copy.close}</Text>
          </Pressable>
        </View>

        <View style={styles.viewerProgressBar}>
          <View style={[styles.viewerProgressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.viewerBody}>
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
            <View style={styles.viewerLoadingOverlay}>
              <ZhaoLoadingIndicator
                label={copy.previewLoading}
                variant="overlay"
              />
            </View>
          ) : null}
          {errorMessage ? (
            <View style={styles.viewerErrorOverlay}>
              <Text style={styles.message}>{errorMessage}</Text>
              <Pressable style={styles.refreshButton} onPress={onRetry}>
                <Text style={styles.refreshButtonText}>{copy.retry}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {renderFooter()}
        {renderCompleteConfirm()}
      </SafeAreaView>
    </Modal>
  );
}
