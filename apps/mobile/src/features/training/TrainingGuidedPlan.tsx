import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import {
  buildTrainingGuidedFlow,
  groupRequiredMaterialsByPosition,
  type RequiredMaterialFlowState,
} from "@/features/training/trainingFlowState";
import type {
  TrainingPlan,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingGuidedPlanProps = {
  copy: TrainingCopySet;
  plan: TrainingPlan;
  onOpenMaterial: (material: TrainingPlanMaterial) => void;
  onRefresh: () => void;
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

function formatTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

function getHeroContent(
  copy: TrainingCopySet,
  hasRequiredMaterials: boolean,
  stage: "intro" | "learning" | "completed",
): {
  badge: string;
  sectionLabel: string;
  title: string;
  body: string;
} {
  if (!hasRequiredMaterials) {
    return {
      badge: copy.guidedStageLearning,
      sectionLabel: copy.guidedLibrary,
      title: copy.guidedLibraryTitle,
      body: copy.guidedLibraryBody,
    };
  }

  if (stage === "intro") {
    return {
      badge: copy.guidedStageIntro,
      sectionLabel: copy.guidedJourney,
      title: copy.guidedIntroTitle,
      body: copy.guidedIntroBody,
    };
  }

  if (stage === "completed") {
    return {
      badge: copy.guidedStageCompleted,
      sectionLabel: copy.guidedJourney,
      title: copy.guidedCompletedTitle,
      body: copy.guidedCompletedBody,
    };
  }

  return {
    badge: copy.guidedStageLearning,
    sectionLabel: copy.guidedJourney,
    title: copy.guidedLearningTitle,
    body: copy.guidedLearningBody,
  };
}

function RequiredJourneyCard({
  copy,
  material,
  state,
  requiredTotal,
  isLast,
  onOpen,
}: {
  copy: TrainingCopySet;
  material: TrainingPlanMaterial;
  state: RequiredMaterialFlowState;
  requiredTotal: number;
  isLast: boolean;
  onOpen: (material: TrainingPlanMaterial) => void;
}) {
  const positionLabel = getPositionLabel(material.positionId, copy.positionLabels);
  const materialType = copy.materialTypes[material.type] || material.type;
  const progressPct = clampPercent(state.progressPct);
  const footerLabel = state.isLocked
    ? copy.guidedLockedHint
    : state.isCompleted
      ? `✓ ${copy.guidedCompleteSeal}`
      : copy.open;

  return (
    <View style={styles.journeyRow}>
      <View style={styles.journeyRail}>
        <View
          style={[
            styles.journeyMarker,
            state.isCurrent ? styles.journeyMarkerCurrent : null,
            state.isCompleted ? styles.journeyMarkerCompleted : null,
            state.isLocked ? styles.journeyMarkerLocked : null,
          ]}
        >
          <Text
            style={[
              styles.journeyMarkerText,
              state.isCurrent ? styles.journeyMarkerTextCurrent : null,
              state.isCompleted ? styles.journeyMarkerTextCompleted : null,
              state.isLocked ? styles.journeyMarkerTextLocked : null,
            ]}
          >
            {state.isCompleted ? "印" : state.order}
          </Text>
        </View>
        {!isLast ? (
          <View
            style={[
              styles.journeyLine,
              state.isCompleted ? styles.journeyLineCompleted : null,
              state.isLocked ? styles.journeyLineLocked : null,
            ]}
          />
        ) : null}
      </View>

      <Pressable
        disabled={state.isLocked}
        style={[
          styles.journeyCard,
          state.isCurrent ? styles.journeyCardCurrent : null,
          state.isCompleted ? styles.journeyCardCompleted : null,
          state.isLocked ? styles.journeyCardLocked : null,
        ]}
        onPress={() => onOpen(material)}
      >
        <View style={styles.journeyCardHeader}>
          <Text style={styles.sectionSubTitle}>
            {formatTemplate(copy.guidedStepCounter, {
              current: state.order,
              total: requiredTotal,
            })}
          </Text>
          <View style={styles.journeyBadgeRow}>
            {state.isCurrent ? (
              <View
                style={[
                  styles.journeyStatusPill,
                  styles.journeyStatusPillCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.journeyStatusText,
                    styles.journeyStatusTextCurrent,
                  ]}
                >
                  {copy.guidedCurrent}
                </Text>
              </View>
            ) : null}
            {state.isCompleted ? (
              <View
                style={[
                  styles.journeyStatusPill,
                  styles.journeyStatusPillCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.journeyStatusText,
                    styles.journeyStatusTextCompleted,
                  ]}
                >
                  {copy.guidedCompleteSeal}
                </Text>
              </View>
            ) : null}
            {state.isLocked ? (
              <View
                style={[
                  styles.journeyStatusPill,
                  styles.journeyStatusPillLocked,
                ]}
              >
                <Text
                  style={[
                    styles.journeyStatusText,
                    styles.journeyStatusTextLocked,
                  ]}
                >
                  {copy.guidedLocked}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.journeyTitle}>{material.title}</Text>
        <Text style={styles.journeyDescription}>
          {material.description || material.originalName}
        </Text>
        <Text style={styles.journeyMeta}>
          {positionLabel} · {materialType} · {formatSize(material.sizeBytes)}
          {material.hasQuiz ? ` · ${copy.quizTag}` : ""}
        </Text>
        <View style={styles.journeyProgressTrack}>
          <View style={[styles.journeyProgressValue, { width: `${progressPct}%` }]} />
        </View>
        <Text
          style={[
            styles.journeyFooter,
            state.isLocked ? styles.journeyFooterLocked : null,
          ]}
        >
          {footerLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function OptionalLibraryCard({
  copy,
  material,
  onOpen,
}: {
  copy: TrainingCopySet;
  material: TrainingPlanMaterial;
  onOpen: (material: TrainingPlanMaterial) => void;
}) {
  const positionLabel = getPositionLabel(material.positionId, copy.positionLabels);
  const materialType = copy.materialTypes[material.type] || material.type;
  const status = copy.statuses[material.progress.status] || material.progress.status;
  const progressPct = clampPercent(material.progress.progressPct);

  return (
    <Pressable style={styles.libraryCard} onPress={() => onOpen(material)}>
      <View style={styles.libraryCardHeader}>
        <Text style={styles.libraryCardTitle}>{material.title}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.libraryCardDescription}>
        {material.description || material.originalName}
      </Text>
      <Text style={styles.libraryCardMeta}>
        {positionLabel} · {materialType} · {formatSize(material.sizeBytes)}
        {material.hasQuiz ? ` · ${copy.quizTag}` : ""}
      </Text>
      <View style={styles.journeyProgressTrack}>
        <View style={[styles.journeyProgressValue, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.libraryCardFooter}>{copy.open}</Text>
    </Pressable>
  );
}

export function TrainingGuidedPlan({
  copy,
  plan,
  onOpenMaterial,
  onRefresh,
}: TrainingGuidedPlanProps) {
  const flow = buildTrainingGuidedFlow(plan);
  const hero = getHeroContent(copy, flow.hasRequiredMaterials, flow.stage);
  const completionPercent = flow.hasRequiredMaterials
    ? clampPercent(plan.summary.completionPercent)
    : 0;
  const currentMaterial = flow.currentMaterial;
  const currentPositionId = currentMaterial?.positionId ?? null;
  const currentRequiredState = currentMaterial
    ? flow.requiredStates.find((state) => state.materialId === currentMaterial.id) ??
      null
    : null;
  const hasAnyMaterials = plan.required.length + plan.optional.length > 0;
  const requiredGroups = groupRequiredMaterialsByPosition(
    plan,
    flow.requiredStates,
  );
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(() => {
    if (!currentPositionId) return new Set<string>();

    return new Set<string>([currentPositionId]);
  });

  const togglePosition = (positionId: string): void => {
    setExpandedPositions((previous) => {
      const next = new Set(previous);

      if (next.has(positionId)) {
        next.delete(positionId);
      } else {
        next.add(positionId);
      }

      return next;
    });
  };

  return (
    <>
      <View
        style={[
          styles.heroPanel,
          flow.stage === "intro" ? styles.heroPanelIntro : null,
          flow.stage === "completed" ? styles.heroPanelCompleted : null,
        ]}
      >
        <View style={styles.heroTopRow}>
          <TrackingText color={authControlStyles.colors.red} size={10.5}>
            {hero.sectionLabel}
          </TrackingText>
          <View
            style={[
              styles.heroSeal,
              flow.stage === "completed" ? styles.heroSealCompleted : null,
            ]}
          >
            <Text
              style={[
                styles.heroSealText,
                flow.stage === "completed" ? styles.heroSealTextCompleted : null,
              ]}
            >
              {hero.badge}
            </Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>{hero.title}</Text>
        <Text style={styles.heroBody}>{hero.body}</Text>

        <View style={styles.heroProgressHeader}>
          <Text style={styles.heroProgressLabel}>{copy.progress}</Text>
          <Text style={styles.heroProgressValue}>{completionPercent}%</Text>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${completionPercent}%` }]} />
        </View>

        <View style={styles.heroStatRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{copy.requiredDone}</Text>
            <Text style={styles.heroStatValue}>
              {flow.requiredCompleted}/{flow.requiredTotal}
            </Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{copy.completed}</Text>
            <Text style={styles.heroStatValue}>{flow.totalCompleted}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{copy.optional}</Text>
            <Text style={styles.heroStatValue}>{flow.optionalTotal}</Text>
          </View>
        </View>

        <View style={styles.heroActionRow}>
          <Pressable style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>{copy.refresh}</Text>
          </Pressable>
          <Text style={styles.heroFootnote}>
            {flow.stage === "completed"
              ? copy.guidedAllRequiredDone
              : flow.hasRequiredMaterials
                ? copy.guidedUnlockHint
                : copy.guidedOptionalReady}
          </Text>
        </View>
      </View>

      {currentMaterial && currentRequiredState ? (
        <View style={styles.focusCard}>
          <View style={styles.focusHeader}>
            <Text style={styles.sectionSubTitle}>{copy.guidedFocusLabel}</Text>
            <Text style={styles.focusStepLabel}>
              {formatTemplate(copy.guidedStepCounter, {
                current: currentRequiredState.order,
                total: flow.requiredTotal,
              })}
            </Text>
          </View>
          <Text style={styles.focusTitle}>{currentMaterial.title}</Text>
          <Text style={styles.focusDescription}>
            {currentMaterial.description || currentMaterial.originalName}
          </Text>
          <Text style={styles.focusMeta}>
            {getPositionLabel(currentMaterial.positionId, copy.positionLabels)} ·{" "}
            {copy.materialTypes[currentMaterial.type] || currentMaterial.type}
            {currentMaterial.hasQuiz ? ` · ${copy.quizTag}` : ""}
          </Text>
          <Pressable
            style={styles.heroPrimaryButton}
            onPress={() => onOpenMaterial(currentMaterial)}
          >
            <Text style={styles.heroPrimaryButtonText}>
              {flow.stage === "intro"
                ? copy.guidedStartJourney
                : copy.guidedContinueJourney}
            </Text>
          </Pressable>
          <Text style={styles.focusHint}>
            {currentMaterial.hasQuiz
              ? `${copy.quizGateHint} ${copy.guidedUnlockHint}`
              : copy.guidedUnlockHint}
          </Text>
        </View>
      ) : null}

      {flow.hasRequiredMaterials ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.guidedJourney}</Text>
            <Text style={styles.sectionCount}>
              {flow.requiredCompleted}/{flow.requiredTotal}
            </Text>
          </View>
          <View style={styles.journeyGroups}>
            {requiredGroups.map((group) => {
              const groupCompleted = group.materials.filter(
                (item) => item.state.isCompleted,
              ).length;
              const groupProgress = clampPercent(
                group.materials.length > 0
                  ? (groupCompleted / group.materials.length) * 100
                  : 0,
              );
              const isExpanded = expandedPositions.has(group.positionId);
              const positionLabel = getPositionLabel(
                group.positionId,
                copy.positionLabels,
              );

              return (
                <View key={group.positionId} style={styles.journeyGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    style={({ pressed }) => [
                      styles.journeyGroupHeader,
                      isExpanded ? styles.journeyGroupHeaderExpanded : null,
                      pressed ? styles.journeyGroupHeaderPressed : null,
                    ]}
                    onPress={() => togglePosition(group.positionId)}
                  >
                    <View style={styles.journeyGroupHeaderRow}>
                      <Text style={styles.journeyGroupTitle}>{positionLabel}</Text>
                      <View style={styles.journeyGroupMetaRow}>
                        <Text style={styles.journeyGroupCount}>
                          {groupCompleted}/{group.materials.length}
                        </Text>
                        <Text
                          style={[
                            styles.journeyGroupChevron,
                            isExpanded ? styles.journeyGroupChevronExpanded : null,
                          ]}
                        >
                          {isExpanded ? "▾" : "▸"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.journeyGroupProgressTrack}>
                      <View
                        style={[
                          styles.journeyGroupProgressValue,
                          { width: `${groupProgress}%` },
                        ]}
                      />
                    </View>
                  </Pressable>
                  {isExpanded ? (
                    <View style={styles.journeyList}>
                      {group.materials.map((item, itemIndex) => (
                        <RequiredJourneyCard
                          key={`${item.material.id}-${item.material.positionId}`}
                          copy={copy}
                          material={item.material}
                          state={item.state}
                          requiredTotal={flow.requiredTotal}
                          isLast={itemIndex === group.materials.length - 1}
                          onOpen={onOpenMaterial}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {plan.optional.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.guidedLibrary}</Text>
            <Text style={styles.sectionCount}>{plan.optional.length}</Text>
          </View>
          <View style={styles.list}>
            {plan.optional.map((material) => (
              <OptionalLibraryCard
                key={`${material.id}-${material.positionId}`}
                copy={copy}
                material={material}
                onOpen={onOpenMaterial}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!hasAnyMaterials ? (
        <View style={styles.section}>
          <Text style={styles.emptyText}>{copy.empty}</Text>
        </View>
      ) : null}
    </>
  );
}
