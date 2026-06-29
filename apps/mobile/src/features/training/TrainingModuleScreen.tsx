import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Directory, File } from "expo-file-system";
import { useScreenName } from "@/lib/useScreenName";
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
import { TrainingGuidedPlan } from "@/features/training/TrainingGuidedPlan";
import { TrainingOptionalLibrary } from "@/features/training/TrainingOptionalLibrary";
import { TrainingPreviewModal } from "@/features/training/TrainingPreviewModal";
import { TrainingQuizModal } from "@/features/training/TrainingQuizModal";
import { applyMaterialProgress } from "@/features/training/trainingProgressRules";
import { buildTrainingGuidedFlow } from "@/features/training/trainingFlowState";
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
  TrainingRecord,
  UpdateTrainingProgressInput,
} from "@/features/training/trainingTypes";

type TrainingModuleScreenProps = {
  language: AuthLanguage;
};

type TrainingView = "hub" | "required" | "optional" | "achievements";

function formatTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

function buildCompletedMaterialFromRecord(
  record: TrainingRecord,
): TrainingPlanMaterial {
  return {
    id: record.materialId,
    positionId: record.positionId,
    type: record.type,
    isRequired: record.isRequired,
    title: record.title,
    description: record.description,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    bucket: record.bucket,
    objectKey: record.objectKey,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    hasQuiz: record.hasQuiz,
    progress: {
      materialId: record.materialId,
      status: "completed",
      progressPct: 100,
      lastOpenedAt: record.completedAt,
      completedAt: record.completedAt,
    },
  };
}

export function TrainingModuleScreen({ language }: TrainingModuleScreenProps) {
  useScreenName("training");
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
  const [activeView, setActiveView] = useState<TrainingView>("hub");
  const [quizMaterialId, setQuizMaterialId] = useState<number | null>(null);
  const [achievementsRefresh, setAchievementsRefresh] = useState(0);

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

  async function syncMaterialProgress(
    materialId: number,
    input: UpdateTrainingProgressInput,
  ): Promise<TrainingMaterialProgress | null> {
    try {
      const progress = await updateTrainingMaterialProgress(materialId, input);
      setPlan((previous) =>
        previous ? applyMaterialProgress(previous, materialId, progress) : previous,
      );

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
      void syncMaterialProgress(material.id, {
        status: "in_progress",
        progressPct: Math.max(material.progress.progressPct, 5),
      });
    }

    try {
      const { fileUri: localFileUri, directoryUri: localDirUri } =
        await downloadTrainingMaterialToCache(material);

      if (isVideoMaterial(material)) {
        const videoDir = new Directory(localDirUri);
        const playerFile = new File(videoDir, "player.html");
        const resumePct =
          material.progress.status === "in_progress"
            ? material.progress.progressPct
            : 0;
        await playerFile.write(buildVideoPlayerHtml(localFileUri, resumePct));
        setPreviewFileUri(playerFile.uri);
        setPreviewBaseUri(videoDir.uri);
      } else if (isPdfMaterial(material)) {
        const pdfDir = new Directory(localDirUri);
        const viewerFile = new File(pdfDir, "pdf-viewer.html");
        const downloadedFile = new File(localFileUri);
        const base64 = await downloadedFile.base64();
        await viewerFile.write(buildPdfViewerHtml(base64));
        setPreviewFileUri(viewerFile.uri);
        setPreviewBaseUri(pdfDir.uri);
      } else {
        setPreviewFileUri(localFileUri);
      }
    } catch (error) {
      console.error("Training material load failed:", error);
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

  function handleBackToHub(): void {
    setActiveView("hub");
  }

  function renderSubViewHeader(title: string): React.ReactNode {
    return (
      <View style={styles.subViewHeader}>
        <Pressable style={styles.subViewBack} onPress={handleBackToHub}>
          <Text style={styles.subViewBackText}>← {copy.hubBack}</Text>
        </Pressable>
        <Text style={styles.sectionSubTitle}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>
    );
  }

  function renderHub(): React.ReactNode {
    if (!plan) return null;

    const flow = buildTrainingGuidedFlow(plan);
    const completionPercent = plan.summary.completionPercent;

    const requiredAction = flow.completedAllRequired
      ? copy.hubActionDone
      : flow.hasStartedRequiredMaterials
        ? copy.hubActionContinue
        : copy.hubActionStart;

    const requiredMeta = flow.hasRequiredMaterials
      ? `${flow.requiredCompleted}/${flow.requiredTotal} ${copy.requiredDone.toLowerCase()}`
      : copy.guidedOptionalReady;

    const optionalMeta = formatTemplate(copy.hubMaterialCount, {
      count: plan.optional.length,
    });

    const achievementMeta = copy.tabAchievements;

    return (
      <View style={styles.section}>
        <View style={styles.hubProgressCard}>
          <View style={styles.hubProgressHeader}>
            <Text style={styles.hubProgressLabel}>{copy.hubOverallProgress}</Text>
            <Text style={styles.hubProgressValue}>{completionPercent}%</Text>
          </View>
          <View style={styles.hubProgressTrack}>
            <View
              style={[
                styles.hubProgressFill,
                { width: `${Math.min(100, Math.max(0, completionPercent))}%` },
              ]}
            />
          </View>
          <View style={styles.hubProgressStats}>
            <Text style={styles.hubProgressStat}>
              {copy.requiredDone}: {flow.requiredCompleted}/{flow.requiredTotal}
            </Text>
            <Text style={styles.hubProgressStat}>
              {copy.completed}: {flow.totalCompleted}
            </Text>
          </View>
        </View>

        <View style={styles.hubEntryList}>
          <Pressable
            style={[styles.hubEntryCard, styles.hubEntryCardRequired]}
            onPress={() => setActiveView("required")}
          >
            <View style={[styles.hubEntryIcon, styles.hubEntryIconRequired]}>
              <Text style={[styles.hubEntryIconText, styles.hubEntryIconTextRequired]}>
                印
              </Text>
            </View>
            <View style={styles.hubEntryBody}>
              <Text style={styles.hubEntryTitle}>{copy.hubRequiredJourney}</Text>
              <Text style={styles.hubEntrySubtitle}>{copy.hubRequiredJourneyBody}</Text>
              <Text style={styles.hubEntryMeta}>{requiredMeta}</Text>
            </View>
            <View
              style={[
                styles.hubEntryAction,
                flow.completedAllRequired ? styles.hubEntryActionDone : null,
              ]}
            >
              <Text
                style={[
                  styles.hubEntryActionText,
                  flow.completedAllRequired ? styles.hubEntryActionTextDone : null,
                ]}
              >
                {requiredAction}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.hubEntryCard}
            onPress={() => setActiveView("optional")}
          >
            <View style={[styles.hubEntryIcon, styles.hubEntryIconOptional]}>
              <Text style={[styles.hubEntryIconText, styles.hubEntryIconTextOptional]}>
                库
              </Text>
            </View>
            <View style={styles.hubEntryBody}>
              <Text style={styles.hubEntryTitle}>{copy.hubOptionalLibrary}</Text>
              <Text style={styles.hubEntrySubtitle}>{copy.hubOptionalLibraryBody}</Text>
              <Text style={styles.hubEntryMeta}>{optionalMeta}</Text>
            </View>
            <View style={styles.hubEntryAction}>
              <Text style={styles.hubEntryActionText}>{copy.hubEnter}</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.hubEntryCard}
            onPress={() => setActiveView("achievements")}
          >
            <View style={[styles.hubEntryIcon, styles.hubEntryIconAchievement]}>
              <Text
                style={[styles.hubEntryIconText, styles.hubEntryIconTextAchievement]}
              >
                誉
              </Text>
            </View>
            <View style={styles.hubEntryBody}>
              <Text style={styles.hubEntryTitle}>{copy.hubAchievements}</Text>
              <Text style={styles.hubEntrySubtitle}>{copy.hubAchievementsBody}</Text>
              <Text style={styles.hubEntryMeta}>{achievementMeta}</Text>
            </View>
            <View style={styles.hubEntryAction}>
              <Text style={styles.hubEntryActionText}>{copy.hubEnter}</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {quizMaterialId !== null ? (
        <TrainingQuizModal
          copy={copy}
          language={language}
          materialId={quizMaterialId}
          onClose={() => setQuizMaterialId(null)}
          onPassed={handleQuizPassed}
        />
      ) : (
        <>
          <View style={styles.header}>
            <TrackingText size={10.5}>{copy.kicker}</TrackingText>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.intro}>{copy.intro}</Text>
          </View>

          {activeView === "hub" ? null : renderSubViewHeader(
            activeView === "required"
              ? copy.hubRequiredJourney
              : activeView === "optional"
                ? copy.hubOptionalLibrary
                : copy.hubAchievements,
          )}

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
              {activeView === "hub" ? renderHub() : null}

              {activeView === "required" ? (
                <TrainingGuidedPlan
                  copy={copy}
                  plan={plan}
                  onOpenMaterial={(material) => void handleOpenMaterial(material)}
                  onRefresh={() => void loadPlan()}
                />
              ) : null}

              {activeView === "optional" ? (
                <TrainingOptionalLibrary
                  copy={copy}
                  plan={plan}
                  onOpenMaterial={(material) => void handleOpenMaterial(material)}
                />
              ) : null}

              {activeView === "achievements" ? (
                <TrainingAchievements
                  copy={copy}
                  language={language}
                  onOpenRecord={(record) =>
                    void handleOpenMaterial(buildCompletedMaterialFromRecord(record))}
                  refreshToken={achievementsRefresh}
                />
              ) : null}
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
        </>
      )}
    </View>
  );
}
