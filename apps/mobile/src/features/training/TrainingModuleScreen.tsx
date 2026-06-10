import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Directory, File } from "expo-file-system";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { TrackingText } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  downloadTrainingMaterialToCache,
  fetchTrainingMyPlan,
  updateTrainingMaterialProgress,
} from "@/features/training/trainingApi";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type {
  TrainingPlan,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";

type TrainingModuleScreenProps = {
  language: AuthLanguage;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, value));
}

function formatSize(sizeBytes: string): string {
  const size = Number(sizeBytes);

  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getPositionLabel(
  code: string,
  labels: Record<string, string>,
): string {
  return labels[code] || code;
}

function isImageMaterial(material: TrainingPlanMaterial | null): boolean {
  if (!material) return false;

  return (
    material.type.toLowerCase() === "image" ||
    material.mimeType.toLowerCase().startsWith("image/")
  );
}

function buildPdfViewerHtml(pdfFileUri: string): string {
  return `<!DOCTYPE html>
<html style="height:100%">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0}
html,body{height:100%;background:#525659;overflow:hidden}
embed{width:100%;height:100%;border:none}
</style>
</head>
<body>
<embed src="${pdfFileUri}" type="application/pdf">
</body>
</html>`;
}

function buildVideoPlayerHtml(videoFileUri: string): string {
  return `<!DOCTYPE html>
<html style="height:100%">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0}
html,body{height:100%;background:#000;overflow:hidden}
body{display:flex;align-items:center;justify-content:center}
video{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain}
</style>
</head>
<body>
<video controls autoplay playsinline webkit-playsinline disablePictureInPicture src="${videoFileUri}"></video>
</body>
</html>`;
}

function isVideoMaterial(material: TrainingPlanMaterial | null): boolean {
  if (!material) return false;

  return (
    material.type.toLowerCase() === "video" ||
    material.mimeType.toLowerCase().startsWith("video/")
  );
}

function TrainingMaterialCard({
  copy,
  material,
  onOpen,
}: {
  copy: typeof TRAINING_COPY.zh;
  material: TrainingPlanMaterial;
  onOpen: (material: TrainingPlanMaterial) => void;
}) {
  const progressPct = clampPercent(material.progress.progressPct);
  const materialType = copy.materialTypes[material.type] || material.type;
  const status = copy.statuses[material.progress.status] || material.progress.status;

  return (
    <Pressable style={styles.card} onPress={() => onOpen(material)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{material.title}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.cardDescription}>
        {material.description || material.originalName}
      </Text>
      <Text style={styles.cardMeta}>
        {material.positionId} · {materialType} · {formatSize(material.sizeBytes)}
      </Text>
      <Text style={styles.cardOpenText}>{copy.open}</Text>
      <View style={styles.cardProgressTrack}>
        <View style={[styles.cardProgressValue, { width: `${progressPct}%` }]} />
      </View>
    </Pressable>
  );
}

function TrainingSection({
  copy,
  materials,
  onOpen,
  title,
}: {
  copy: typeof TRAINING_COPY.zh;
  materials: TrainingPlanMaterial[];
  onOpen: (material: TrainingPlanMaterial) => void;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{materials.length}</Text>
      </View>
      {materials.length > 0 ? (
        <View style={styles.list}>
          {materials.map((material) => (
            <TrainingMaterialCard
              key={`${material.id}-${material.positionId}`}
              copy={copy}
              material={material}
              onOpen={onOpen}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{copy.empty}</Text>
      )}
    </View>
  );
}

export function TrainingModuleScreen({ language }: TrainingModuleScreenProps) {
  const copy = TRAINING_COPY[language];
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewMaterial, setPreviewMaterial] =
    useState<TrainingPlanMaterial | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewFileUri, setPreviewFileUri] = useState("");
  const [previewBaseUri, setPreviewBaseUri] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const positionLabels = useMemo(
    () =>
      (plan?.positionCodes || []).map((code) =>
        getPositionLabel(code, copy.positionLabels),
      ),
    [copy.positionLabels, plan?.positionCodes],
  );

  async function loadPlan(): Promise<void> {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const nextPlan = await fetchTrainingMyPlan();
      setPlan(nextPlan);
    } catch {
      setPlan(null);
      setErrorMessage(copy.error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPlan();
  }, [copy.error]);

  const completionPercent = clampPercent(plan?.summary.completionPercent ?? 0);
  const canShowPreview = Boolean(previewMaterial && previewFileUri);
  const shouldShowImagePreview = canShowPreview && isImageMaterial(previewMaterial);
  const shouldShowWebPreview = canShowPreview && !shouldShowImagePreview;

  async function handleOpenMaterial(material: TrainingPlanMaterial): Promise<void> {
    if (!material.objectKey) {
      setErrorMessage(copy.openError);
      return;
    }

    setPreviewError("");
    setIsLoadingPreview(true);
    setPreviewFileUri("");
    setPreviewBaseUri("");
    setPreviewMaterial(material);

    try {
      await updateTrainingMaterialProgress(material.id, {
        status:
          material.progress.status === "completed" ? "completed" : "in_progress",
        progressPct: Math.max(material.progress.progressPct, 5),
      });
    } catch (progressError) {
      if (__DEV__) {
        console.warn("Training progress sync failed", progressError);
      }
      // Opening the content is more important than blocking on progress sync.
    }

    try {
      const localFileUri = await downloadTrainingMaterialToCache(material);

      if (isVideoMaterial(material)) {
        const videoDirPath = localFileUri.substring(
          0,
          localFileUri.lastIndexOf("/"),
        );
        const videoDir = new Directory(videoDirPath);
        const playerFile = new File(videoDir, "player.html");
        await playerFile.write(buildVideoPlayerHtml(localFileUri));
        setPreviewFileUri(playerFile.uri);
        setPreviewBaseUri(videoDir.uri);
      } else if (
        material.type.toLowerCase() === "pdf" ||
        material.mimeType.toLowerCase() === "application/pdf"
      ) {
        const pdfDirPath = localFileUri.substring(
          0,
          localFileUri.lastIndexOf("/"),
        );
        const pdfDir = new Directory(pdfDirPath);
        const viewerFile = new File(pdfDir, "pdf-viewer.html");
        await viewerFile.write(buildPdfViewerHtml(localFileUri));
        setPreviewFileUri(viewerFile.uri);
        setPreviewBaseUri(pdfDir.uri);
      } else {
        setPreviewFileUri(localFileUri);
      }

    } catch {
      setPreviewError(copy.previewError);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handleClosePreview(): void {
    setPreviewMaterial(null);
    setPreviewError("");
    setIsLoadingPreview(false);
    setPreviewFileUri("");
    setPreviewBaseUri("");
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrackingText size={10.5}>{copy.kicker}</TrackingText>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.intro}>{copy.intro}</Text>
      </View>

      {isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}

      {!isLoading && errorMessage ? (
        <>
          <Text style={styles.message}>{errorMessage}</Text>
          <Pressable style={styles.refreshButton} onPress={() => void loadPlan()}>
            <Text style={styles.refreshButtonText}>{copy.refresh}</Text>
          </Pressable>
        </>
      ) : null}

      {!isLoading && !errorMessage && plan ? (
        <>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressLabel}>{copy.progress}</Text>
                <Text style={styles.progressNumber}>{completionPercent}%</Text>
              </View>
              <Pressable style={styles.refreshButton} onPress={() => void loadPlan()}>
                <Text style={styles.refreshButtonText}>{copy.refresh}</Text>
              </Pressable>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressValue, { width: `${completionPercent}%` }]}
              />
            </View>
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{copy.requiredDone}</Text>
                <Text style={styles.statValue}>
                  {plan.summary.requiredCompleted}/{plan.summary.requiredTotal}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{copy.completed}</Text>
                <Text style={styles.statValue}>
                  {
                    [...plan.required, ...plan.optional].filter(
                      (item) => item.progress.status === "completed",
                    ).length
                  }
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{copy.positions}</Text>
            <View style={styles.pillRow}>
              {positionLabels.map((label) => (
                <View key={label} style={styles.pill}>
                  <Text style={styles.pillText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <TrainingSection
            copy={copy}
            materials={plan.required}
            title={copy.required}
            onOpen={(material) => void handleOpenMaterial(material)}
          />
          <TrainingSection
            copy={copy}
            materials={plan.optional}
            title={copy.optional}
            onOpen={(material) => void handleOpenMaterial(material)}
          />
        </>
      ) : null}

      <Modal
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        visible={!!previewMaterial}
        onRequestClose={handleClosePreview}
      >
        <View style={styles.previewModalRoot}>
          <View style={styles.previewPanel}>
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleGroup}>
                <Text style={styles.cardMeta}>
                  {previewMaterial?.positionId || "-"}
                </Text>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {previewMaterial?.title || "-"}
                </Text>
              </View>
              <Pressable style={styles.previewCloseButton} onPress={handleClosePreview}>
                <Text style={styles.refreshButtonText}>{copy.close}</Text>
              </Pressable>
            </View>
            <View style={styles.previewBody}>
              {shouldShowImagePreview ? (
                <Image
                  resizeMode="contain"
                  source={{ uri: previewFileUri }}
                  style={styles.previewImage}
                />
              ) : null}
              {shouldShowWebPreview ? (
                <WebView
                  allowFileAccess
                  allowFileAccessFromFileURLs
                  allowingReadAccessToURL={previewBaseUri || previewFileUri}
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback={Platform.OS === "ios"}
                  mediaPlaybackRequiresUserAction={false}
                  originWhitelist={["*"]}
                  source={{
                    uri: previewFileUri,
                  }}
                  startInLoadingState
                  style={styles.previewWebView}
                  onLoadEnd={() => setIsLoadingPreview(false)}
                  onError={() => {
                    setPreviewError(copy.previewError);
                    setIsLoadingPreview(false);
                  }}
                />
              ) : null}
              {isLoadingPreview ? (
                <View style={styles.previewOverlay}>
                  <ZhaoLoadingIndicator label={copy.previewLoading} variant="overlay" />
                </View>
              ) : null}
              {previewError ? (
                <View style={styles.previewOverlay}>
                  <Text style={styles.message}>{previewError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
