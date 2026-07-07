import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Directory, File } from "expo-file-system";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  downloadTrainingMaterialToCache,
  fetchTrainingMyPlan,
  updateTrainingMaterialProgress,
} from "@/features/training/trainingApi";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import { buildTrainingMapData } from "@/features/training/trainingMapState";
import { TrainingPreviewModal } from "@/features/training/TrainingPreviewModal";
import { TrainingQuizModal } from "@/features/training/TrainingQuizModal";
import { applyMaterialProgress } from "@/features/training/trainingProgressRules";
import { trainingStyles } from "@/features/training/trainingStyles";
import {
  buildPdfViewerHtml,
  buildVideoPlayerHtml,
  isPdfMaterial,
  isVideoMaterial,
} from "@/features/training/trainingViewer";
import type {
  TrainingMapData,
  TrainingMaterialProgress,
  TrainingPlan,
  TrainingPlanMaterial,
  UpdateTrainingProgressInput,
} from "@/features/training/trainingTypes";

type TrainingModuleScreenProps = {
  language: AuthLanguage;
};

type NextTrainingFocus = {
  layerLabel: string;
  material: TrainingPlanMaterial;
};

type LayerProgressItem = {
  completed: number;
  label: string;
  total: number;
  unlocked: boolean;
};

function findNextTrainingFocus(
  mapData: TrainingMapData,
  copy: (typeof TRAINING_COPY)["zh"],
): NextTrainingFocus | null {
  const sharedNode = mapData.sharedMaterials.find((node) => !node.isCompleted);
  if (sharedNode) {
    return {
      layerLabel: copy.mapLayerShared,
      material: sharedNode.material,
    };
  }

  for (const gate of mapData.positionGates) {
    const requiredNode = gate.materials.find((node) => !node.isCompleted);
    if (requiredNode) {
      return {
        layerLabel: copy.positionLabels[gate.positionId] || gate.positionId,
        material: requiredNode.material,
      };
    }
  }

  const advancedNode = mapData.advancedMaterials.find((node) => !node.isCompleted);
  if (advancedNode) {
    return {
      layerLabel: copy.mapLayerAdvanced,
      material: advancedNode.material,
    };
  }

  return null;
}

function buildLayerProgressItems(
  mapData: TrainingMapData,
  copy: (typeof TRAINING_COPY)["zh"],
): LayerProgressItem[] {
  return [
    {
      label: copy.mapLayerShared,
      completed: mapData.summary.sharedCompleted,
      total: mapData.summary.sharedTotal,
      unlocked: mapData.layer1Unlocked,
    },
    {
      label: copy.mapLayerRequired,
      completed: mapData.summary.requiredCompleted,
      total: mapData.summary.requiredTotal,
      unlocked: mapData.layer2Unlocked,
    },
    {
      label: copy.mapLayerAdvanced,
      completed: mapData.summary.advancedCompleted,
      total: mapData.summary.advancedTotal,
      unlocked: mapData.layer3Unlocked,
    },
  ];
}

function formatLayerProgress(item: LayerProgressItem): string {
  if (!item.unlocked) return "-";

  return `${item.completed}/${item.total}`;
}

function getMaterialTypeLabel(
  material: TrainingPlanMaterial,
  copy: (typeof TRAINING_COPY)["zh"],
): string {
  return copy.materialTypes[material.type] || material.type;
}

/**
 * 闯关地图主组件
 *
 * Hub = 顶部进度卡片 + 三层闯关地图
 * - Layer 1: 全员共享材料
 * - Layer 2: 岗位必修（按岗位入口进入内部关卡）
 * - Layer 3: 高阶课程
 *
 * 成就/称号由底部入口进入单独页面
 */
export function TrainingModuleScreen({ language }: TrainingModuleScreenProps) {
  const copy = TRAINING_COPY[language];

  const [localLoading, setLocalLoading] = useState(false);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<TrainingPlanMaterial | null>(null);
  const [quizMaterial, setQuizMaterial] = useState<TrainingPlanMaterial | null>(null);
  const [previewFileUri, setPreviewFileUri] = useState<string | null>(null);
  const [previewBaseUri, setPreviewBaseUri] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [expandedPositions, setExpandedPositions] = useState<Record<string, boolean>>({});

  const loadPlan = useCallback(async () => {
    setLocalLoading(true);
    setPlanError(null);
    try {
      const data = await fetchTrainingMyPlan();
      setPlan(data);
    } catch {
      setPlanError(copy.error);
    } finally {
      setLocalLoading(false);
    }
  }, [copy.error]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const mapData: TrainingMapData | null = useMemo(() => {
    if (!plan) return null;
    return buildTrainingMapData(plan);
  }, [plan]);

  const handleOpenMaterial = useCallback(
    async (material: TrainingPlanMaterial) => {
      setPreviewMaterial(material);
      setPreviewFileUri(null);
      setPreviewBaseUri(null);
      setIsLoadingPreview(true);
      setPreviewError(null);

      try {
        const { fileUri, directoryUri } = await downloadTrainingMaterialToCache(material);

        if (isVideoMaterial(material)) {
          const videoDirectory = new Directory(directoryUri);
          const playerFile = new File(videoDirectory, "player.html");
          const resumePct =
            material.progress.status === "in_progress" ? material.progress.progressPct : 0;

          await playerFile.write(buildVideoPlayerHtml(fileUri, resumePct));
          setPreviewFileUri(playerFile.uri);
          setPreviewBaseUri(videoDirectory.uri);
          return;
        }

        if (isPdfMaterial(material)) {
          const pdfDirectory = new Directory(directoryUri);
          const viewerFile = new File(pdfDirectory, "pdf-viewer.html");
          const downloadedFile = new File(fileUri);
          const base64Data = await downloadedFile.base64();

          await viewerFile.write(buildPdfViewerHtml(base64Data));
          setPreviewFileUri(viewerFile.uri);
          setPreviewBaseUri(pdfDirectory.uri);
          return;
        }

        setPreviewFileUri(fileUri);
        setPreviewBaseUri(directoryUri);
      } catch {
        setPreviewError(copy.openError);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [copy.openError],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewMaterial(null);
    setPreviewFileUri(null);
    setPreviewBaseUri(null);
    setPreviewError(null);
  }, []);

  const syncMaterialProgress = useCallback(
    async (
      materialId: number,
      input: UpdateTrainingProgressInput,
    ): Promise<TrainingMaterialProgress | null> => {
      try {
        const progress = await updateTrainingMaterialProgress(materialId, input);
        setPlan((previous) =>
          previous ? applyMaterialProgress(previous, materialId, progress) : previous,
        );

        return progress;
      } catch {
        return null;
      }
    },
    [],
  );

  const handleStartQuiz = useCallback((material: TrainingPlanMaterial) => {
    setPreviewMaterial(null);
    setQuizMaterial(material);
  }, []);

  const handleQuizClose = useCallback(() => {
    setQuizMaterial(null);
    void loadPlan();
  }, [loadPlan]);

  const togglePosition = useCallback((positionId: string) => {
    setExpandedPositions((prev) => ({
      ...prev,
      [positionId]: !prev[positionId],
    }));
  }, []);

  const handleStudy = useCallback(
    (material: TrainingPlanMaterial) => {
      void handleOpenMaterial(material);
    },
    [handleOpenMaterial],
  );

  const handleQuiz = useCallback((material: TrainingPlanMaterial) => {
    setQuizMaterial(material);
  }, []);

  if (quizMaterial) {
    return (
      <TrainingQuizModal
        copy={copy}
        language={language}
        materialId={quizMaterial.id}
        onClose={handleQuizClose}
        onPassed={handleQuizClose}
      />
    );
  }

  if (localLoading && !plan) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ZhaoLoadingIndicator />
      </View>
    );
  }

  if (planError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
        }}
      >
        <Text style={trainingStyles.message}>{planError}</Text>
        <Pressable style={trainingStyles.refreshButton} onPress={() => void loadPlan()}>
          <Text style={trainingStyles.refreshButtonText}>{copy.refresh}</Text>
        </Pressable>
      </View>
    );
  }

  if (
    !mapData ||
    mapData.summary.sharedTotal + mapData.summary.requiredTotal + mapData.summary.advancedTotal ===
      0
  ) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
        }}
      >
        <Text style={trainingStyles.emptyText}>{copy.empty}</Text>
      </View>
    );
  }

  const { summary, layer1Unlocked, layer2Unlocked, layer3Unlocked } = mapData;
  const nextFocus = findNextTrainingFocus(mapData, copy);
  const layerProgressItems = buildLayerProgressItems(mapData, copy);
  const totalMaterials = summary.sharedTotal + summary.requiredTotal + summary.advancedTotal;
  const completedMaterials =
    summary.sharedCompleted + summary.requiredCompleted + summary.advancedCompleted;

  const hubContent = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={trainingStyles.container}>
      <View style={trainingStyles.mapHeroPanel}>
        <View style={trainingStyles.mapHeroHeader}>
          <View style={trainingStyles.mapHeroTitleGroup}>
            <Text style={trainingStyles.mapHeroKicker}>{copy.kicker}</Text>
            <Text style={trainingStyles.mapHeroTitle}>{copy.title}</Text>
          </View>
          <Pressable style={trainingStyles.mapHeroRefreshButton} onPress={() => void loadPlan()}>
            <Text style={trainingStyles.mapHeroRefreshText}>{copy.refresh}</Text>
          </Pressable>
        </View>
        <Text style={trainingStyles.mapHeroIntro}>{copy.intro}</Text>

        <View style={trainingStyles.mapHeroProgressRow}>
          <View style={trainingStyles.mapHeroProgressCopy}>
            <Text style={trainingStyles.mapHeroProgressLabel}>{copy.hubOverallProgress}</Text>
            <Text style={trainingStyles.mapHeroProgressValue}>{summary.overallPercent}%</Text>
          </View>
          <View style={trainingStyles.mapHeroProgressTrack}>
            <View
              style={[trainingStyles.mapHeroProgressFill, { width: `${summary.overallPercent}%` }]}
            />
          </View>
        </View>

        {nextFocus ? (
          <Pressable
            style={trainingStyles.mapFocusCard}
            onPress={() => handleStudy(nextFocus.material)}
          >
            <View style={trainingStyles.mapFocusTopRow}>
              <Text style={trainingStyles.mapFocusLabel}>{copy.guidedFocusLabel}</Text>
              <Text style={trainingStyles.mapFocusLayer}>{nextFocus.layerLabel}</Text>
            </View>
            <Text style={trainingStyles.mapFocusTitle}>{nextFocus.material.title}</Text>
            <Text style={trainingStyles.mapFocusMeta}>
              {getMaterialTypeLabel(nextFocus.material, copy)}
              {nextFocus.material.hasQuiz ? ` · ${copy.quizTag}` : ""}
            </Text>
            <Text style={trainingStyles.mapFocusAction}>{copy.hubActionContinue}</Text>
          </Pressable>
        ) : (
          <View style={trainingStyles.mapFocusCardCompleted}>
            <Text style={trainingStyles.mapFocusLabel}>{copy.guidedStageCompleted}</Text>
            <Text style={trainingStyles.mapFocusTitle}>{copy.guidedCompletedTitle}</Text>
            <Text style={trainingStyles.mapFocusMeta}>
              {copy.completed} {completedMaterials}/{totalMaterials}
            </Text>
          </View>
        )}

        <View style={trainingStyles.mapLayerSummaryRow}>
          {layerProgressItems.map((item) => (
            <View
              key={item.label}
              style={[
                trainingStyles.mapLayerSummaryItem,
                !item.unlocked && trainingStyles.mapLayerSummaryItemLocked,
              ]}
            >
              <Text
                style={[
                  trainingStyles.mapLayerSummaryLabel,
                  !item.unlocked && trainingStyles.mapLayerSummaryLabelLocked,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  trainingStyles.mapLayerSummaryValue,
                  !item.unlocked && trainingStyles.mapLayerSummaryValueLocked,
                ]}
              >
                {formatLayerProgress(item)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={trainingStyles.mapContainer}>
        <MapLayerSection
          title={copy.mapLayerShared}
          body={copy.mapLayerSharedBody}
          completed={summary.sharedCompleted}
          total={summary.sharedTotal}
          unlocked={layer1Unlocked}
          unlockHint={copy.mapUnlockNext}
        >
          {mapData.sharedMaterials.map((node, index) => (
            <MapNodeCard
              key={node.material.id}
              node={node}
              index={index}
              onStudy={handleStudy}
              onQuiz={handleQuiz}
              copy={copy}
            />
          ))}
        </MapLayerSection>

        <View style={trainingStyles.mapLayerDivider} />

        <MapLayerSection
          title={copy.mapLayerRequired}
          body={copy.mapLayerRequiredBody}
          completed={summary.requiredCompleted}
          total={summary.requiredTotal}
          unlocked={layer2Unlocked}
          unlockHint={layer1Unlocked ? undefined : copy.mapUnlockNext}
        >
          {mapData.positionGates.map((gate) => {
            const isExpanded = expandedPositions[gate.positionId] ?? false;
            return (
              <View key={gate.positionId}>
                <Pressable
                  style={[
                    trainingStyles.mapPositionGateHeader,
                    isExpanded && { borderColor: "#c11616" },
                  ]}
                  onPress={() => togglePosition(gate.positionId)}
                >
                  <Text style={trainingStyles.mapPositionGateTitle}>{gate.positionLabel}</Text>
                  <Text style={trainingStyles.mapPositionGateProgress}>
                    {gate.completedCount}/{gate.totalCount}
                  </Text>
                </Pressable>
                {isExpanded && (
                  <View style={trainingStyles.mapNodeList}>
                    {gate.materials.map((node, index) => (
                      <MapNodeCard
                        key={node.material.id}
                        node={node}
                        index={index}
                        onStudy={handleStudy}
                        onQuiz={handleQuiz}
                        copy={copy}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </MapLayerSection>

        <View style={trainingStyles.mapLayerDivider} />

        <MapLayerSection
          title={copy.mapLayerAdvanced}
          body={copy.mapLayerAdvancedBody}
          completed={summary.advancedCompleted}
          total={summary.advancedTotal}
          unlocked={layer3Unlocked}
          unlockHint={copy.mapUnlockCondition}
        >
          {mapData.advancedMaterials.map((node, index) => (
            <MapNodeCard
              key={node.material.id}
              node={node}
              index={index}
              onStudy={handleStudy}
              onQuiz={handleQuiz}
              copy={copy}
            />
          ))}
        </MapLayerSection>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <View style={{ flex: 1 }}>
      {hubContent}

      <TrainingPreviewModal
        copy={copy}
        material={previewMaterial}
        fileUri={previewFileUri ?? ""}
        baseUri={previewBaseUri ?? ""}
        isLoading={isLoadingPreview}
        errorMessage={previewError ?? ""}
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
    </View>
  );
}

/**
 * 单层地图区域
 */
function MapLayerSection({
  title,
  body,
  completed,
  total,
  unlocked,
  unlockHint,
  children,
}: {
  title: string;
  body: string;
  completed: number;
  total: number;
  unlocked: boolean;
  unlockHint?: string;
  children: ReactNode;
}) {
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);

  return (
    <View style={[trainingStyles.mapLayerCard, !unlocked && trainingStyles.mapLayerCardLocked]}>
      <View style={trainingStyles.mapLayerHeader}>
        <Text
          style={[trainingStyles.mapLayerTitle, !unlocked && trainingStyles.mapLayerTitleLocked]}
        >
          {title}
        </Text>
        <View
          style={[
            trainingStyles.mapLayerBadge,
            total > 0 && completed === total && trainingStyles.mapLayerBadgeDone,
            !unlocked && trainingStyles.mapLayerBadgeLocked,
          ]}
        >
          <Text
            style={[
              trainingStyles.mapLayerBadgeText,
              total > 0 && completed === total && trainingStyles.mapLayerBadgeTextDone,
              !unlocked && trainingStyles.mapLayerBadgeTextLocked,
            ]}
          >
            {completed}/{total}
          </Text>
        </View>
      </View>

      <Text style={[trainingStyles.mapLayerBody, !unlocked && trainingStyles.mapLayerBodyLocked]}>
        {body}
      </Text>

      {!unlocked && unlockHint ? (
        <Text style={trainingStyles.mapLayerUnlockHint}>{unlockHint}</Text>
      ) : null}

      {total > 0 ? (
        <View>
          <View style={trainingStyles.mapLayerProgressTrack}>
            <View style={[trainingStyles.mapLayerProgressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={trainingStyles.mapLayerProgressLabel}>{percent}%</Text>
        </View>
      ) : null}

      {unlocked ? <View style={trainingStyles.mapNodeList}>{children}</View> : null}
    </View>
  );
}

/**
 * 单个节点卡片
 */
function MapNodeCard({
  node,
  index,
  onStudy,
  onQuiz,
  copy: c,
}: {
  node: import("@/features/training/trainingTypes").TrainingMapMaterialNode;
  index: number;
  onStudy: (material: TrainingPlanMaterial) => void;
  onQuiz: (material: TrainingPlanMaterial) => void;
  copy: (typeof TRAINING_COPY)["zh"];
}) {
  const material = node.material;
  const isDone = node.isCompleted;
  const isRight = index % 2 === 1;
  const checkpointLabel = isDone ? "✓" : String(index + 1).padStart(2, "0");
  const typeLabel = getMaterialTypeLabel(material, c);
  const description = material.description || material.originalName;

  return (
    <View style={[trainingStyles.mapNodeRow, isRight && trainingStyles.mapNodeRowRight]}>
      <View
        style={[trainingStyles.mapNodeCheckpoint, isRight && trainingStyles.mapNodeCheckpointRight]}
      >
        <View style={[trainingStyles.mapNodeSeal, isDone && trainingStyles.mapNodeSealCompleted]}>
          <Text
            style={[
              trainingStyles.mapNodeSealText,
              isDone && trainingStyles.mapNodeSealTextCompleted,
            ]}
          >
            {checkpointLabel}
          </Text>
        </View>

        <View style={[trainingStyles.mapNodePanel, isDone && trainingStyles.mapNodePanelCompleted]}>
          <View style={trainingStyles.mapNodeTitleRow}>
            <View style={trainingStyles.mapNodeTitleGroup}>
              <Text style={trainingStyles.mapNodeTitle}>{material.title}</Text>
              <Text style={trainingStyles.mapNodeDescription} numberOfLines={2}>
                {description}
              </Text>
            </View>
            {isDone ? (
              <View style={trainingStyles.mapNodeDoneTag}>
                <Text style={trainingStyles.mapNodeDoneText}>{c.mapNodeComplete}</Text>
              </View>
            ) : null}
          </View>

          <View style={trainingStyles.mapNodePillRow}>
            <View style={trainingStyles.mapNodeTypePill}>
              <Text style={trainingStyles.mapNodeTypeText}>{typeLabel}</Text>
            </View>
            {node.hasQuiz ? (
              <View style={trainingStyles.mapNodeQuizTag}>
                <Text style={trainingStyles.mapNodeQuizText}>{c.quizTag}</Text>
              </View>
            ) : null}
          </View>

          <View style={trainingStyles.mapNodeActionRow}>
            <Pressable style={trainingStyles.mapNodeActionButton} onPress={() => onStudy(material)}>
              <Text style={trainingStyles.mapNodeActionText}>{c.mapNodeStudy}</Text>
            </Pressable>
            {node.hasQuiz && !node.isQuizPassed ? (
              <Pressable
                style={trainingStyles.mapNodeActionButton}
                onPress={() => onQuiz(material)}
              >
                <Text style={trainingStyles.mapNodeActionText}>{c.mapNodeQuiz}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
