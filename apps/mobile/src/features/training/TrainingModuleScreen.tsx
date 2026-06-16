import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
import { TrainingAchievements } from "@/features/training/TrainingAchievements";
import { TrainingPreviewModal } from "@/features/training/TrainingPreviewModal";
import { TrainingQuizModal } from "@/features/training/TrainingQuizModal";
import { applyMaterialProgress } from "@/features/training/trainingProgressRules";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import {
  buildPdfViewerHtml,
  buildVideoPlayerHtml,
  isPdfMaterial,
  isVideoMaterial,
} from "@/features/training/trainingViewer";
import type {
  TrainingMaterialProgress,
  TrainingPlan,
  TrainingPlanMaterial,
  UpdateTrainingProgressInput,
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
        {material.hasQuiz ? ` · ${copy.quizTag}` : ""}
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
  const [activeView, setActiveView] = useState<"plan" | "achievements">("plan");
  const [quizMaterialId, setQuizMaterialId] = useState<number | null>(null);
  const [achievementsRefresh, setAchievementsRefresh] = useState(0);

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

  async function syncMaterialProgress(
    materialId: number,
    input: UpdateTrainingProgressInput,
  ): Promise<TrainingMaterialProgress | null> {
    try {
      const progress = await updateTrainingMaterialProgress(materialId, input);
      setPlan((previous) =>
        previous ? applyMaterialProgress(previous, materialId, progress) : previous,
      );

      // Completing a (non-quiz) material can unlock a title server-side, so
      // refresh the achievements panel — mirrors the quiz-pass path.
      if (progress.status === "completed") {
        setAchievementsRefresh((value) => value + 1);
      }

      return progress;
    } catch (progressError) {
      if (__DEV__) {
        console.warn("Training progress sync failed", progressError);
      }

      return null;
    }
  }

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

    if (material.progress.status !== "completed") {
      // Opening the content is more important than blocking on progress sync.
      void syncMaterialProgress(material.id, {
        status: "in_progress",
        progressPct: Math.max(material.progress.progressPct, 5),
      });
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
        const resumePct =
          material.progress.status === "in_progress"
            ? material.progress.progressPct
            : 0;
        await playerFile.write(buildVideoPlayerHtml(localFileUri, resumePct));
        setPreviewFileUri(playerFile.uri);
        setPreviewBaseUri(videoDir.uri);
      } else if (isPdfMaterial(material)) {
        const pdfDirPath = localFileUri.substring(
          0,
          localFileUri.lastIndexOf("/"),
        );
        const pdfDir = new Directory(pdfDirPath);
        const viewerFile = new File(pdfDir, "pdf-viewer.html");
        const base64 = await new File(localFileUri).base64();
        await viewerFile.write(buildPdfViewerHtml(base64));
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

  function handleStartQuiz(material: TrainingPlanMaterial): void {
    handleClosePreview();
    setQuizMaterialId(material.id);
  }

  function handleQuizPassed(): void {
    void loadPlan();
    setAchievementsRefresh((value) => value + 1);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrackingText size={10.5}>{copy.kicker}</TrackingText>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.intro}>{copy.intro}</Text>
      </View>

      <View style={styles.segment}>
        {(["plan", "achievements"] as const).map((key) => (
          <Pressable
            key={key}
            style={[
              styles.segmentItem,
              activeView === key ? styles.segmentItemActive : null,
            ]}
            onPress={() => setActiveView(key)}
          >
            <Text
              style={[
                styles.segmentText,
                activeView === key ? styles.segmentTextActive : null,
              ]}
            >
              {key === "plan" ? copy.tabPlan : copy.tabAchievements}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeView === "achievements" ? (
        <TrainingAchievements
          copy={copy}
          language={language}
          refreshToken={achievementsRefresh}
        />
      ) : null}

      {activeView === "plan" && isLoading ? (
        <ZhaoLoadingIndicator label={copy.loading} />
      ) : null}

      {activeView === "plan" && !isLoading && errorMessage ? (
        <>
          <Text style={styles.message}>{errorMessage}</Text>
          <Pressable style={styles.refreshButton} onPress={() => void loadPlan()}>
            <Text style={styles.refreshButtonText}>{copy.refresh}</Text>
          </Pressable>
        </>
      ) : null}

      {activeView === "plan" && !isLoading && !errorMessage && plan ? (
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

      <TrainingPreviewModal
        copy={copy}
        material={previewMaterial}
        fileUri={previewFileUri}
        baseUri={previewBaseUri}
        isLoading={isLoadingPreview}
        errorMessage={previewError}
        onClose={handleClosePreview}
        onRetry={() => {
          if (previewMaterial) void handleOpenMaterial(previewMaterial);
        }}
        onWebViewLoadEnd={() => setIsLoadingPreview(false)}
        onWebViewError={() => {
          setPreviewError(copy.previewError);
          setIsLoadingPreview(false);
        }}
        onStartQuiz={handleStartQuiz}
        syncProgress={syncMaterialProgress}
      />

      <TrainingQuizModal
        copy={copy}
        language={language}
        materialId={quizMaterialId}
        onClose={() => setQuizMaterialId(null)}
        onPassed={handleQuizPassed}
      />
    </View>
  );
}
