"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BadgeRarity,
  BadgeStatus,
  EmployeeTrainingBadge,
  TrainingBadgeDefinition,
  TrainingBadgeIconType,
  TrainingTrack,
} from "@/types/trainingBadge";
import { TrainingBadgeWall } from "@/components/training-badges";
import {
  fetchTrainingBadges,
  fetchTrainingMaterials,
  fetchTrainingMyBadges,
  updateTrainingBadgeRequirements,
} from "@/features/training/services/trainingMediaApi";
import type {
  TrainingBadge,
  TrainingEmployeeBadge,
  TrainingMaterial,
  TrainingMyBadges,
} from "@/features/training/types/training";
import styles from "@/components/training-badges/training-badges.module.css";

const TRACKS: TrainingTrack[] = [
  "general",
  "front",
  "kitchen",
  "management",
  "safety",
  "hygiene",
  "service",
  "certification",
];
const RARITIES: BadgeRarity[] = ["common", "rare", "epic", "legendary"];

const zh: Record<string, string> = {
  "badge.status.locked": "未开始",
  "badge.status.in_progress": "进行中",
  "badge.status.completed": "已完成",
  "badge.status.certified": "已认证",
  "badge.status.failed": "未达标",
  "badge.status.expired": "已过期",
  "badge.filter.all": "全部",
  "badge.filter.general": "通用",
  "badge.filter.front": "前厅",
  "badge.filter.kitchen": "厨房",
  "badge.filter.management": "管理",
  "badge.filter.safety": "安全",
  "badge.filter.hygiene": "卫生",
  "badge.filter.certification": "高级认证",
  "badge.filter.service": "服务",
  "badge.ui.close": "关闭",
  "badge.ui.progress": "进度",
  "badge.ui.score": "分数",
  "badge.ui.requiredScore": "要求分数",
  "badge.ui.requiredTraining": "要求培训",
  "badge.ui.requiredAssessment": "测验资料",
  "badge.ui.certifiedAt": "认证时间",
  "badge.ui.expiresAt": "过期时间",
  "badge.ui.level": "等级",
  "badge.ui.certified": "已认证",
  "badge.ui.inProgress": "进行中",
  "badge.ui.locked": "未开始",
  "badge.ui.total": "总徽章",
  "badge.ui.completionRate": "总完成率",
  "badge.ui.recent": "最近获得",
  "badge.ui.next": "下一个最接近认证",
};

function t(key: string): string {
  return zh[key] ?? key;
}

function normalizeTrack(track: string): TrainingTrack {
  return TRACKS.includes(track as TrainingTrack)
    ? (track as TrainingTrack)
    : "general";
}

function normalizeRarity(rarity: string): BadgeRarity {
  return RARITIES.includes(rarity as BadgeRarity)
    ? (rarity as BadgeRarity)
    : "common";
}

function toBadgeDefinition(badge: TrainingEmployeeBadge): TrainingBadgeDefinition {
  return {
    id: badge.code,
    track: normalizeTrack(badge.track),
    rarity: normalizeRarity(badge.rarity),
    level: badge.level ?? undefined,
    requiredTrainingIds: badge.requirements.map((requirement) => requirement.title),
    requiredAssessmentIds: badge.requirements
      .filter((requirement) => requirement.type === "QUIZ")
      .map((requirement) => requirement.title),
    requiredScore: badge.requiredScore,
    requiredCompletionRate: badge.requiredCompletionRate,
    i18nKey: badge.name.zh,
    descriptionKey: badge.description.zh ?? "",
    unlockHintKey:
      badge.requirements.length > 0
        ? `完成：${badge.requirements.map((requirement) => requirement.title).join("、")}`
        : "管理员尚未配置徽章要求。",
    iconType: badge.iconType as TrainingBadgeIconType,
  };
}

function toEmployeeBadge(badge: TrainingEmployeeBadge): EmployeeTrainingBadge {
  return {
    badgeId: badge.code,
    status: badge.status as BadgeStatus,
    progress: badge.progress,
    maxProgress: badge.maxProgress,
    completionRate: badge.completionRate,
    score: badge.score ?? undefined,
    certifiedAt: badge.earnedAt ?? undefined,
  };
}

function getMaterialId(material: TrainingMaterial): number | null {
  const id = Number(material.id);

  return Number.isInteger(id) ? id : null;
}

function getMaterialTitle(material: TrainingMaterial): string {
  return material.title || `Material ${material.id}`;
}

function getRequirementSummary(count: number): string {
  if (count === 0) return "尚未绑定资料";

  return `${count} 项培训资料`;
}

export default function TrainingBadgeDemoPage() {
  const [badgesData, setBadgesData] = useState<TrainingMyBadges | null>(null);
  const [adminBadges, setAdminBadges] = useState<TrainingBadge[]>([]);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [selectedBadgeCode, setSelectedBadgeCode] = useState("");
  const [draftMaterialIds, setDraftMaterialIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTargets, setIsLoadingTargets] = useState(true);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [targetErrorMessage, setTargetErrorMessage] = useState("");
  const [targetMessage, setTargetMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadBadges() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextBadges = await fetchTrainingMyBadges();
        if (isActive) setBadgesData(nextBadges);
      } catch {
        if (isActive) {
          setBadgesData({ badges: [], earnedCount: 0, totalCount: 0 });
          setErrorMessage("徽章墙暂时不可用");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadBadges();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadBindingTargets() {
      setIsLoadingTargets(true);
      setTargetErrorMessage("");

      try {
        const [nextBadges, nextMaterials] = await Promise.all([
          fetchTrainingBadges(),
          fetchTrainingMaterials(),
        ]);

        if (!isActive) return;

        setAdminBadges(nextBadges);
        setMaterials(nextMaterials);
        setSelectedBadgeCode((current) => current || nextBadges[0]?.code || "");
      } catch {
        if (isActive) {
          setAdminBadges([]);
          setMaterials([]);
          setTargetErrorMessage("绑定目标暂时不可用，请确认后端迁移已执行。");
        }
      } finally {
        if (isActive) setIsLoadingTargets(false);
      }
    }

    void loadBindingTargets();

    return () => {
      isActive = false;
    };
  }, []);

  const badges = useMemo(
    () => (badgesData?.badges ?? []).map(toBadgeDefinition),
    [badgesData],
  );
  const employeeBadges = useMemo(
    () => (badgesData?.badges ?? []).map(toEmployeeBadge),
    [badgesData],
  );
  const selectedBadge = useMemo(
    () => adminBadges.find((badge) => badge.code === selectedBadgeCode) ?? null,
    [adminBadges, selectedBadgeCode],
  );

  useEffect(() => {
    setDraftMaterialIds(
      selectedBadge?.requirements.map((requirement) => requirement.materialId) ?? [],
    );
    setTargetMessage("");
  }, [selectedBadge]);

  function toggleMaterial(materialId: number): void {
    setDraftMaterialIds((current) =>
      current.includes(materialId)
        ? current.filter((id) => id !== materialId)
        : [...current, materialId],
    );
  }

  async function saveBindingTarget(): Promise<void> {
    if (!selectedBadge || isSavingTarget) return;

    setIsSavingTarget(true);
    setTargetMessage("");

    try {
      const updatedBadge = await updateTrainingBadgeRequirements(
        selectedBadge.code,
        draftMaterialIds,
      );
      setAdminBadges((current) =>
        current.map((badge) =>
          badge.code === updatedBadge.code ? updatedBadge : badge,
        ),
      );
      setBadgesData(await fetchTrainingMyBadges());
      setTargetMessage("绑定目标已保存");
    } catch (error) {
      setTargetMessage(error instanceof Error ? error.message : "绑定目标保存失败");
    } finally {
      setIsSavingTarget(false);
    }
  }

  return (
    <main className={styles.demoPage}>
      <div className={styles.demoShell}>
        <header>
          <h1 className={styles.demoTitle}>员工培训徽章</h1>
          <p className={styles.demoLead}>
            徽章由培训完成度和测验成绩自动发放，结果来自后台正式记录。
          </p>
        </header>

        {isLoadingTargets ? (
          <section className={styles.bindingPanel}>
            <p className={styles.meta}>BADGE TARGET MAP</p>
            <p className={styles.bindingHint}>正在加载徽章绑定目标...</p>
          </section>
        ) : targetErrorMessage ? (
          <section className={styles.bindingPanel}>
            <p className={styles.meta}>BADGE TARGET MAP</p>
            <h2 className={styles.bindingTitle}>徽章绑定目标</h2>
            <p className={styles.bindingHint}>{targetErrorMessage}</p>
          </section>
        ) : adminBadges.length > 0 ? (
          <section className={styles.bindingPanel}>
            <div className={styles.bindingHeader}>
              <div>
                <p className={styles.meta}>BADGE TARGET MAP</p>
                <h2 className={styles.bindingTitle}>徽章绑定目标</h2>
              </div>
              <button
                type="button"
                className={styles.bindingSaveButton}
                disabled={!selectedBadge || isSavingTarget}
                onClick={() => void saveBindingTarget()}
              >
                {isSavingTarget ? "保存中" : "保存绑定"}
              </button>
            </div>

            <div className={styles.bindingGrid}>
              <div className={styles.bindingBadgeColumn}>
                <label className={styles.bindingField}>
                  <span>目标徽章</span>
                  <select
                    value={selectedBadgeCode}
                    onChange={(event) => setSelectedBadgeCode(event.target.value)}
                  >
                    {adminBadges.map((badge) => (
                      <option key={badge.code} value={badge.code}>
                        {badge.name.zh}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedBadge ? (
                  <div className={styles.bindingBadgePreview}>
                    <span className={styles.statusPill}>
                      {selectedBadge.track} · {selectedBadge.rarity}
                    </span>
                    <strong>{selectedBadge.name.zh}</strong>
                    <small>{selectedBadge.code}</small>
                    <div className={styles.bindingStats}>
                      <span>
                        <b>{draftMaterialIds.length}</b>
                        {getRequirementSummary(draftMaterialIds.length)}
                      </span>
                      <span>
                        <b>{selectedBadge.requiredScore}</b>
                        要求分数
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={styles.bindingTargetBox}>
                <span className={styles.bindingFieldLabel}>绑定培训资料</span>
                <div className={styles.bindingMaterialList}>
                  {materials.map((material) => {
                    const materialId = getMaterialId(material);
                    if (materialId === null) return null;
                    const isChecked = draftMaterialIds.includes(materialId);

                    return (
                      <label
                        key={materialId}
                        className={`${styles.bindingMaterialItem} ${
                          isChecked ? styles.bindingMaterialItemActive : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMaterial(materialId)}
                        />
                        <span>
                          <strong>{getMaterialTitle(material)}</strong>
                          <small>
                            #{materialId} · {material.positionId ?? "-"} ·{" "}
                            {material.type ?? "-"}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className={styles.bindingHint}>
              {targetMessage ||
                "保存后，所选资料会成为该徽章的发放目标。"}
            </p>
          </section>
        ) : null}

        {isLoading ? (
          <div className={styles.summary}>正在加载徽章...</div>
        ) : (
          <>
            {errorMessage ? (
              <div className={styles.summary}>{errorMessage}</div>
            ) : null}
          <TrainingBadgeWall
            badges={badges}
            employeeBadges={employeeBadges}
            getBadgeLabel={(badge) => badge.i18nKey}
            getBadgeDescription={(badge) => badge.descriptionKey}
            getUnlockHint={(badge) => badge.unlockHintKey}
            getStatusLabel={(status) => t(`badge.status.${status}`)}
            getFilterLabel={(filter) => t(`badge.filter.${filter}`)}
            labels={{
              close: t("badge.ui.close"),
              progress: t("badge.ui.progress"),
              score: t("badge.ui.score"),
              requiredScore: t("badge.ui.requiredScore"),
              requiredTraining: t("badge.ui.requiredTraining"),
              requiredAssessment: t("badge.ui.requiredAssessment"),
              certifiedAt: t("badge.ui.certifiedAt"),
              expiresAt: t("badge.ui.expiresAt"),
              level: t("badge.ui.level"),
              certified: t("badge.ui.certified"),
              inProgress: t("badge.ui.inProgress"),
              locked: t("badge.ui.locked"),
              total: t("badge.ui.total"),
              completionRate: t("badge.ui.completionRate"),
              recent: t("badge.ui.recent"),
              next: t("badge.ui.next"),
            }}
          />
          </>
        )}
      </div>
    </main>
  );
}
