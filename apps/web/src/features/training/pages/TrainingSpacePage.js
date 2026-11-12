"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import CourseCard from "@/features/training/components/CourseCard";
import TrainingFolder from "@/features/training/components/TrainingFolder";
import folderStyles from "@/features/training/components/training-folders.module.css";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  fetchTrainingMyPlan,
  fetchTrainingPositions,
} from "@/features/training/services/trainingMediaApi";
import {
  UNCATEGORIZED_FOLDER_ID,
  groupByPosition,
} from "@/features/training/utils/trainingFolders";
import {
  DEFAULT_TRAINING_POSITION_TREE,
  TRAINING_POSITION_MANAGE_PERMISSION,
  findTrainingPosition,
  getTrainingPositionLabel,
  mergeDefaultTrainingPositions,
} from "@/features/training/utils/trainingPositions";

const MATERIAL_CATEGORY_TYPES = [
  "all",
  "VIDEO",
  "PDF",
  "QUIZ",
  "ARTICLE",
  "IMAGE",
  "OTHER",
];

function filterCourses(items, statusFilter, categoryFilter, searchQuery) {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || item.type === categoryFilter;
    const searchableContent = [
      item.title,
      item.desc,
      item.positionId,
      item.type,
      item.dur,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !normalizedSearchQuery || searchableContent.includes(normalizedSearchQuery);

    return matchesStatus && matchesCategory && matchesSearch;
  });
}

function toCourseCard(material, isRequired) {
  const status = material.progress?.status || "not_started";
  const progressPct = Number(material.progress?.progressPct ?? 0);

  return {
    id: `material-${material.id}`,
    materialId: material.id,
    type: material.type,
    positionId: material.positionId,
    req: isRequired,
    title: material.title,
    dur: material.mimeType || material.type,
    prog: Number.isFinite(progressPct) ? progressPct : 0,
    status,
    desc: material.description || material.originalName,
  };
}

function replaceCourseTitle(template, title) {
  return template.replace("{title}", title);
}

function fillTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

function buildOnboardingContent(course, t, positionName) {
  const copy = t.page.onboarding;

  if (!course) {
    return {
      mark: "成",
      kicker: copy.emptyKicker,
      title: copy.emptyTitle,
      desc: copy.emptyDesc,
      action: copy.emptyAction,
    };
  }

  const status = course.status || "not_started";
  const statusTemplate = copy.statusTitle[status] || copy.statusTitle.not_started;
  const markByStatus = {
    not_started: "学",
    in_progress: "续",
    completed: "复",
  };

  return {
    mark: markByStatus[status] || markByStatus.not_started,
    kicker: `${copy.requiredKicker} · ${positionName} · ${copy.progressLabel} ${course.prog}%`,
    title: replaceCourseTitle(statusTemplate, course.title),
    desc: course.desc || copy.defaultDesc,
    action: t.shared.courseAction[status] || t.shared.courseAction.not_started,
  };
}

function FilterButtons({ options, value, onChange, label, styles }) {
  return (
    <div className={styles.filterButtons} role="group" aria-label={label}>
      {options.map(([optionValue, optionLabel]) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          className={`${styles.filterButton} ${
            value === optionValue ? styles.filterButtonActive : ""
          }`}
          onClick={() => onChange(optionValue)}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

export default function TrainingSpacePage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [positionTree, setPositionTree] = useState(
    DEFAULT_TRAINING_POSITION_TREE,
  );
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadTrainingPlan() {
      setIsLoadingPlan(true);
      setPlanError("");

      try {
        const [nextPlan, nextPositions] = await Promise.all([
          fetchTrainingMyPlan(),
          // Position names are cosmetic: fall back to defaults if this fails.
          fetchTrainingPositions().catch(() => []),
        ]);
        if (isActive) {
          setTrainingPlan(nextPlan);
          setPositionTree(mergeDefaultTrainingPositions(nextPositions));
        }
      } catch (error) {
        if (isActive) {
          setPlanError(error.message || "Error");
        }
      } finally {
        if (isActive) {
          setIsLoadingPlan(false);
        }
      }
    }

    void loadTrainingPlan();

    return () => {
      isActive = false;
    };
  }, []);

  const canManagePositions = user?.permissions?.includes(
    TRAINING_POSITION_MANAGE_PERMISSION,
  );
  const requiredPlanItems = trainingPlan?.required ?? [];
  const optionalPlanItems = trainingPlan?.optional ?? [];
  const planSummary = trainingPlan?.summary ?? {
    requiredTotal: 0,
    requiredCompleted: 0,
    completionPercent: 0,
  };
  const metrics = useMemo(
    () => [
      {
        value: `${planSummary.completionPercent}%`,
        label: "MY REQUIRED RATE",
      },
      {
        value: `${planSummary.requiredCompleted}/${planSummary.requiredTotal}`,
        label: "COMPLETED",
      },
      {
        value: String(optionalPlanItems.length),
        label: "OPTIONAL",
      },
    ],
    [optionalPlanItems.length, planSummary],
  );
  const requiredCourses = useMemo(
    () => requiredPlanItems.map((item) => toCourseCard(item, true)),
    [requiredPlanItems],
  );
  const allCourses = useMemo(
    () => [
      ...requiredCourses,
      ...optionalPlanItems.map((item) => toCourseCard(item, false)),
    ],
    [optionalPlanItems, requiredCourses],
  );
  const continueCourse =
    requiredCourses.find((course) => course.status !== "completed") ??
    requiredCourses[0] ??
    null;
  const continueHref = continueCourse
    ? `/dashboard/training/materials/player?id=${continueCourse.materialId}`
    : "/dashboard/training";
  const hasActiveFilters =
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    Boolean(searchQuery.trim());
  const folders = useMemo(
    () =>
      groupByPosition(
        filterCourses(allCourses, statusFilter, categoryFilter, searchQuery),
      ),
    [allCourses, categoryFilter, searchQuery, statusFilter],
  );

  const defaultExpandedIds = useMemo(
    () =>
      new Set(continueCourse?.positionId ? [continueCourse.positionId] : []),
    [continueCourse],
  );
  const effectiveExpandedIds = expandedIds ?? defaultExpandedIds;

  function toggleFolder(folderId) {
    const next = new Set(effectiveExpandedIds);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedIds(next);
  }

  return (
    <TrainingLayout
      pageCopy={{
        zh: { shared: TRAINING_COPY.zh.shared, page: TRAINING_COPY.zh.training },
        en: { shared: TRAINING_COPY.en.shared, page: TRAINING_COPY.en.training },
        fr: { shared: TRAINING_COPY.fr.shared, page: TRAINING_COPY.fr.training },
      }}
    >
      {({ lang, t, styles }) => {
        const copy = t.shared.folders;
        const getFolderName = (positionId) => {
          if (positionId === UNCATEGORIZED_FOLDER_ID) {
            return copy.uncategorized;
          }
          const position = findTrainingPosition(positionTree, positionId);
          return position
            ? getTrainingPositionLabel(position, lang)
            : positionId;
        };
        const onboardingContent = buildOnboardingContent(
          continueCourse,
          t,
          continueCourse ? getFolderName(continueCourse.positionId) : "",
        );
        const statusOptions = Object.entries(t.shared.courseFilters);
        const categoryOptions = MATERIAL_CATEGORY_TYPES.map((type) => [
          type,
          t.shared.materialFilters[type],
        ]);

        return (
          <>
            <section className={styles.pageHeaderCard}>
              <div>
                <p className={styles.pageStep}>
                  <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                  <span>{t.page.stepDetail}</span>
                </p>
                {canManagePositions ? (
                  <Link
                    href="/dashboard/training/positions"
                    className={styles.uploadEntryLink}
                  >
                    {copy.positionManage}
                  </Link>
                ) : null}
              </div>
              <div className={styles.metricGrid}>
                {metrics.map((metric) => (
                  <article key={metric.label} className={styles.metricCard}>
                    <p className={styles.metricValue}>{metric.value}</p>
                    <p className={styles.metricLabel}>{metric.label}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.onboardingBanner}>
              <div className={styles.onboardingMark}>{onboardingContent.mark}</div>
              <div className={styles.onboardingText}>
                <p className={styles.onboardingKicker}>{onboardingContent.kicker}</p>
                <h2 className={styles.onboardingTitle}>{onboardingContent.title}</h2>
                <p className={styles.onboardingDetail}>{onboardingContent.desc}</p>
              </div>
              <Link href={continueHref} className={styles.onboardingAction}>
                <span>{onboardingContent.action}</span>
                <span className={styles.onboardingArrow}>→</span>
              </Link>
            </section>

            {planError ? (
              <p className={folderStyles.error} role="alert">
                {copy.planLoadFailed}
                {planError}
              </p>
            ) : null}

            <section
              className={styles.courseCategoryBar}
              aria-label={t.shared.courseFiltersLabel}
            >
              <div className={styles.courseFilterGroup}>
                <span className={styles.courseCategoryLabel}>
                  {t.shared.materialCategoryLabel}
                </span>
                <FilterButtons
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  label={t.shared.materialCategoryLabel}
                  styles={styles}
                />
              </div>
              <div className={styles.courseFilterGroup}>
                <FilterButtons
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  label={copy.progressFilterLabel}
                  styles={styles}
                />
              </div>
              <label className={styles.courseSearch}>
                <span className={styles.courseCategoryLabel}>
                  {t.shared.courseSearchLabel}
                </span>
                <input
                  type="search"
                  className={styles.courseSearchInput}
                  value={searchQuery}
                  placeholder={t.shared.courseSearchPlaceholder}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
            </section>

            <section aria-label={copy.foldersLabel}>
              {folders.length > 0 && !hasActiveFilters ? (
                <div className={folderStyles.folderToolbar}>
                  <span />
                  <div className={folderStyles.toolbarActions}>
                    <button
                      type="button"
                      className={styles.filterButton}
                      onClick={() =>
                        setExpandedIds(new Set(folders.map((f) => f.positionId)))
                      }
                    >
                      {copy.expandAll}
                    </button>
                    <button
                      type="button"
                      className={styles.filterButton}
                      onClick={() => setExpandedIds(new Set())}
                    >
                      {copy.collapseAll}
                    </button>
                  </div>
                </div>
              ) : null}

              {isLoadingPlan ? (
                <div className={folderStyles.empty}>{copy.loading}</div>
              ) : planError ? (
                <div className={folderStyles.empty}>{copy.loadFailed}</div>
              ) : folders.length === 0 ? (
                <div className={folderStyles.empty}>
                  {hasActiveFilters ? t.shared.empty : copy.empty}
                </div>
              ) : (
                <div className={folderStyles.folderList}>
                  {folders.map((folder) => (
                    <TrainingFolder
                      key={folder.positionId}
                      folder={folder}
                      name={getFolderName(folder.positionId)}
                      countLabel={fillTemplate(copy.materialCount, {
                        count: folder.totalCount,
                      })}
                      requiredLabel={fillTemplate(copy.requiredCount, {
                        done: folder.completedRequiredCount,
                        total: folder.requiredCount,
                      })}
                      isExpanded={
                        hasActiveFilters ||
                        effectiveExpandedIds.has(folder.positionId)
                      }
                      onToggle={toggleFolder}
                    >
                      <div className={folderStyles.cardGrid}>
                        {folder.courses.map((course) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            statusLabel={t.shared.courseStatus[course.status]}
                            requiredLabel={copy.requiredBadge}
                          />
                        ))}
                      </div>
                    </TrainingFolder>
                  ))}
                </div>
              )}
            </section>
          </>
        );
      }}
    </TrainingLayout>
  );
}
