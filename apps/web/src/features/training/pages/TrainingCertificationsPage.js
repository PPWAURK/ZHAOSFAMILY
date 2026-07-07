"use client";

import { useEffect, useMemo, useState } from "react";
import { TrainingBadgeWall } from "@/components/training-badges";
import {
  fetchTrainingBadges,
  fetchTrainingMaterials,
  fetchTrainingMyBadges,
  updateTrainingBadgeRequirements,
} from "@/features/training/services/trainingMediaApi";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import badgeStyles from "@/components/training-badges/training-badges.module.css";

const TRACKS = [
  "general",
  "front",
  "kitchen",
  "management",
  "safety",
  "hygiene",
  "service",
  "certification",
];
const RARITIES = ["common", "rare", "epic", "legendary"];

const BADGE_LABELS = {
  zh: {
    status: {
      locked: "未开始",
      in_progress: "进行中",
      completed: "已完成",
      certified: "已认证",
      failed: "未达标",
      expired: "已过期",
    },
    filter: {
      all: "全部",
      general: "通用",
      front: "前厅",
      kitchen: "厨房",
      management: "管理",
      safety: "安全",
      hygiene: "卫生",
      certification: "高级认证",
      service: "服务",
    },
    ui: {
      close: "关闭",
      progress: "进度",
      score: "分数",
      requiredScore: "要求分数",
      requiredTraining: "要求培训",
      requiredAssessment: "测验资料",
      certifiedAt: "认证时间",
      expiresAt: "过期时间",
      level: "等级",
      certified: "已认证",
      inProgress: "进行中",
      locked: "未开始",
      total: "总徽章",
      completionRate: "总完成率",
      recent: "最近获得",
      next: "下一个最接近认证",
    },
  },
  en: {
    status: {
      locked: "Locked",
      in_progress: "In Progress",
      completed: "Completed",
      certified: "Certified",
      failed: "Failed",
      expired: "Expired",
    },
    filter: {
      all: "All",
      general: "General",
      front: "Front",
      kitchen: "Kitchen",
      management: "Management",
      safety: "Safety",
      hygiene: "Hygiene",
      certification: "Advanced",
      service: "Service",
    },
    ui: {
      close: "Close",
      progress: "Progress",
      score: "Score",
      requiredScore: "Required Score",
      requiredTraining: "Required Training",
      requiredAssessment: "Required Assessment",
      certifiedAt: "Certified At",
      expiresAt: "Expires At",
      level: "Level",
      certified: "Certified",
      inProgress: "In Progress",
      locked: "Locked",
      total: "Total",
      completionRate: "Completion Rate",
      recent: "Recent",
      next: "Next Closest",
    },
  },
  fr: {
    status: {
      locked: "Verrouillé",
      in_progress: "En cours",
      completed: "Terminé",
      certified: "Certifié",
      failed: "Échoué",
      expired: "Expiré",
    },
    filter: {
      all: "Tout",
      general: "Général",
      front: "Salle",
      kitchen: "Cuisine",
      management: "Gestion",
      safety: "Sécurité",
      hygiene: "Hygiène",
      certification: "Avancé",
      service: "Service",
    },
    ui: {
      close: "Fermer",
      progress: "Progrès",
      score: "Score",
      requiredScore: "Score requis",
      requiredTraining: "Formation requise",
      requiredAssessment: "Évaluation requise",
      certifiedAt: "Certifié le",
      expiresAt: "Expire le",
      level: "Niveau",
      certified: "Certifié",
      inProgress: "En cours",
      locked: "Verrouillé",
      total: "Total",
      completionRate: "Taux d'achèvement",
      recent: "Récent",
      next: "Prochain",
    },
  },
};

function normalizeTrack(track) {
  return TRACKS.includes(track) ? track : "general";
}

function normalizeRarity(rarity) {
  return RARITIES.includes(rarity) ? rarity : "common";
}

function toBadgeDefinition(badge) {
  return {
    id: badge.code,
    track: normalizeTrack(badge.track),
    rarity: normalizeRarity(badge.rarity),
    level: badge.level ?? undefined,
    requiredTrainingIds: badge.requirements.map((r) => r.title),
    requiredAssessmentIds: badge.requirements
      .filter((r) => r.type === "QUIZ")
      .map((r) => r.title),
    requiredScore: badge.requiredScore,
    requiredCompletionRate: badge.requiredCompletionRate,
    i18nKey: badge.name.zh,
    descriptionKey: badge.description.zh ?? "",
    unlockHintKey:
      badge.requirements.length > 0
        ? `完成：${badge.requirements.map((r) => r.title).join("、")}`
        : "管理员尚未配置徽章要求。",
    iconType: badge.iconType,
  };
}

function toEmployeeBadge(badge) {
  return {
    badgeId: badge.code,
    status: badge.status,
    progress: badge.progress,
    maxProgress: badge.maxProgress,
    completionRate: badge.completionRate,
    score: badge.score ?? undefined,
    certifiedAt: badge.earnedAt ?? undefined,
  };
}

function getMaterialId(material) {
  const id = Number(material.id);
  return Number.isInteger(id) ? id : null;
}

function getMaterialTitle(material) {
  return material.title || `Material ${material.id}`;
}

function getRequirementSummary(count) {
  if (count === 0) return "尚未绑定资料";
  return `${count} 项培训资料`;
}

export default function TrainingCertificationsPage() {
  const [badgesData, setBadgesData] = useState(null);
  const [adminBadges, setAdminBadges] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedBadgeCode, setSelectedBadgeCode] = useState("");
  const [draftMaterialIds, setDraftMaterialIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTargets, setIsLoadingTargets] = useState(true);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [targetErrorMessage, setTargetErrorMessage] = useState("");
  const [targetMessage, setTargetMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBadges() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const next = await fetchTrainingMyBadges();
        if (active) setBadgesData(next);
      } catch {
        if (active) {
          setBadgesData({ badges: [], earnedCount: 0, totalCount: 0 });
          setErrorMessage("徽章墙暂时不可用");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadBadges();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadBindingTargets() {
      setIsLoadingTargets(true);
      setTargetErrorMessage("");

      try {
        const [nextBadges, nextMaterials] = await Promise.all([
          fetchTrainingBadges(),
          fetchTrainingMaterials(),
        ]);

        if (!active) return;

        setAdminBadges(nextBadges);
        setMaterials(nextMaterials);
        setSelectedBadgeCode((c) => c || nextBadges[0]?.code || "");
      } catch {
        if (active) {
          setAdminBadges([]);
          setMaterials([]);
          setTargetErrorMessage("绑定目标暂时不可用，请确认后端迁移已执行。");
        }
      } finally {
        if (active) setIsLoadingTargets(false);
      }
    }

    void loadBindingTargets();

    return () => {
      active = false;
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
    () => adminBadges.find((b) => b.code === selectedBadgeCode) ?? null,
    [adminBadges, selectedBadgeCode],
  );

  useEffect(() => {
    setDraftMaterialIds(selectedBadge?.requirements.map((r) => r.materialId) ?? []);
    setTargetMessage("");
  }, [selectedBadge]);

  function toggleMaterial(materialId) {
    setDraftMaterialIds((current) =>
      current.includes(materialId)
        ? current.filter((id) => id !== materialId)
        : [...current, materialId],
    );
  }

  async function saveBindingTarget() {
    if (!selectedBadge || isSavingTarget) return;

    setIsSavingTarget(true);
    setTargetMessage("");

    try {
      const updated = await updateTrainingBadgeRequirements(
        selectedBadge.code,
        draftMaterialIds,
      );
      setAdminBadges((current) =>
        current.map((b) => (b.code === updated.code ? updated : b)),
      );
      setBadgesData(await fetchTrainingMyBadges());
      setTargetMessage("绑定目标已保存");
    } catch (error) {
      setTargetMessage(
        error instanceof Error ? error.message : "绑定目标保存失败",
      );
    } finally {
      setIsSavingTarget(false);
    }
  }

  return (
    <TrainingLayout
      pageCopy={{
        zh: {
          shared: TRAINING_COPY.zh.shared,
          page: TRAINING_COPY.zh.certifications,
        },
        en: {
          shared: TRAINING_COPY.en.shared,
          page: TRAINING_COPY.en.certifications,
        },
        fr: {
          shared: TRAINING_COPY.fr.shared,
          page: TRAINING_COPY.fr.certifications,
        },
      }}
    >
      {({ t, styles, lang }) => {
        const labels = BADGE_LABELS[lang] ?? BADGE_LABELS.zh;

        return (
          <>
            <section className={styles.pageHeaderCard}>
              <div>
                <p className={styles.pageStep}>
                  <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                  <span>{t.page.stepDetail}</span>
                </p>
              </div>
              <div className={styles.metricGrid}>
                {t.page.metrics.map((metric) => (
                  <article key={metric.label} className={styles.metricCard}>
                    <p className={styles.metricValue}>{metric.value}</p>
                    <p className={styles.metricLabel}>{metric.label}</p>
                  </article>
                ))}
              </div>
            </section>

            {isLoadingTargets ? (
              <section className={styles.section}>
                <div className={styles.sectionBar}>
                  <h2 className={styles.sectionTitle}>
                    <span className={styles.sectionCounter}>A</span>
                    <span>徽章绑定目标</span>
                    <span className={styles.sectionTitleEn}>
                      Badge Target Map
                    </span>
                  </h2>
                </div>
                <p>正在加载徽章绑定目标...</p>
              </section>
            ) : targetErrorMessage ? (
              <section className={styles.section}>
                <div className={styles.sectionBar}>
                  <h2 className={styles.sectionTitle}>
                    <span className={styles.sectionCounter}>A</span>
                    <span>徽章绑定目标</span>
                    <span className={styles.sectionTitleEn}>
                      Badge Target Map
                    </span>
                  </h2>
                </div>
                <p>{targetErrorMessage}</p>
              </section>
            ) : adminBadges.length > 0 ? (
              <section className={styles.section}>
                <div className={styles.sectionBar}>
                  <h2 className={styles.sectionTitle}>
                    <span className={styles.sectionCounter}>A</span>
                    <span>徽章绑定目标</span>
                    <span className={styles.sectionTitleEn}>
                      Badge Target Map
                    </span>
                  </h2>
                  <button
                    type="button"
                    className={styles.certAction}
                    disabled={!selectedBadge || isSavingTarget}
                    onClick={() => void saveBindingTarget()}
                  >
                    {isSavingTarget ? "保存中" : "保存绑定"}
                  </button>
                </div>

                <div className={badgeStyles.bindingGrid}>
                  <div className={badgeStyles.bindingBadgeColumn}>
                    <label className={badgeStyles.bindingField}>
                      <span>目标徽章</span>
                      <select
                        value={selectedBadgeCode}
                        onChange={(e) =>
                          setSelectedBadgeCode(e.target.value)
                        }
                      >
                        {adminBadges.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name.zh}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedBadge ? (
                      <div className={badgeStyles.bindingBadgePreview}>
                        <span className={badgeStyles.statusPill}>
                          {selectedBadge.track} · {selectedBadge.rarity}
                        </span>
                        <strong>{selectedBadge.name.zh}</strong>
                        <small>{selectedBadge.code}</small>
                        <div className={badgeStyles.bindingStats}>
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

                  <div className={badgeStyles.bindingTargetBox}>
                    <span className={badgeStyles.bindingFieldLabel}>
                      绑定培训资料
                    </span>
                    <div className={badgeStyles.bindingMaterialList}>
                      {materials.map((material) => {
                        const mid = getMaterialId(material);
                        if (mid === null) return null;
                        const checked = draftMaterialIds.includes(mid);

                        return (
                          <label
                            key={mid}
                            className={`${badgeStyles.bindingMaterialItem} ${
                              checked
                                ? badgeStyles.bindingMaterialItemActive
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMaterial(mid)}
                            />
                            <span>
                              <strong>{getMaterialTitle(material)}</strong>
                              <small>
                                #{mid} · {material.positionId ?? "-"} ·{" "}
                                {material.type ?? "-"}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className={badgeStyles.bindingHint}>
                  {targetMessage || "保存后，所选资料会成为该徽章的发放目标。"}
                </p>
              </section>
            ) : null}

            <section className={styles.section}>
              <div className={styles.sectionBar}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionCounter}>B</span>
                  <span>培训徽章墙</span>
                  <span className={styles.sectionTitleEn}>
                    Training Badges
                  </span>
                </h2>
              </div>

              {isLoading ? (
                <p>正在加载徽章...</p>
              ) : errorMessage ? (
                <p>{errorMessage}</p>
              ) : (
                <TrainingBadgeWall
                  badges={badges}
                  employeeBadges={employeeBadges}
                  getBadgeLabel={(badge) => badge.i18nKey}
                  getBadgeDescription={(badge) => badge.descriptionKey}
                  getUnlockHint={(badge) => badge.unlockHintKey}
                  getStatusLabel={(status) => labels.status[status] ?? status}
                  getFilterLabel={(filter) => labels.filter[filter] ?? filter}
                  labels={labels.ui}
                />
              )}
            </section>
          </>
        );
      }}
    </TrainingLayout>
  );
}
