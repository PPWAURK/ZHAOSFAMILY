"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import { fetchTrainingMyPlan } from "@/features/training/services/trainingMediaApi";
import {
  TRAINING_POSITION_MANAGE_PERMISSION,
} from "@/features/training/utils/trainingPositions";

const COURSE_GLYPHS = {
  VIDEO: "影",
  PDF: "册",
  QUIZ: "测",
  ARTICLE: "文",
  IMAGE: "图",
  OTHER: "件",
};

const COURSE_KIND_LABELS = {
  VIDEO: "VIDEO",
  PDF: "PDF",
  QUIZ: "QUIZ",
  ARTICLE: "ARTICLE",
  IMAGE: "IMAGE",
  OTHER: "OTHER",
};

const MATERIAL_CATEGORY_TYPES = [
  "all",
  "VIDEO",
  "PDF",
  "QUIZ",
  "ARTICLE",
  "IMAGE",
  "OTHER",
];

function filterCourses(
  items,
  statusFilter,
  categoryFilter,
  positionFilter,
  searchQuery,
) {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || item.type === categoryFilter;
    const matchesPosition =
      positionFilter === "all" || item.positionId === positionFilter;
    const searchableContent = [
      item.title,
      item.desc,
      item.positionId,
      item.type,
      item.dur,
      ...item.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !normalizedSearchQuery || searchableContent.includes(normalizedSearchQuery);

    return matchesStatus && matchesCategory && matchesPosition && matchesSearch;
  });
}

function toCourseCard(material) {
  const status = material.progress?.status || "not_started";
  const progressPct = Number(material.progress?.progressPct ?? 0);

  return {
    id: `material-${material.id}`,
    materialId: material.id,
    type: material.type,
    positionId: material.positionId,
    req: Boolean(material.isRequired),
    title: material.title,
    en: material.positionId,
    dur: material.mimeType || material.type,
    prog: Number.isFinite(progressPct) ? progressPct : 0,
    status,
    desc: material.description || material.originalName,
    tags: [
      material.positionId,
      material.type,
      material.isRequired ? "必修" : "选修",
      material.mimeType || "FILE",
    ],
  };
}

function replaceCourseTitle(template, title) {
  return template.replace("{title}", title);
}

function buildOnboardingContent(course, t) {
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
    kicker: `${copy.requiredKicker} · ${course.positionId} · ${copy.progressLabel} ${course.prog}%`,
    title: replaceCourseTitle(statusTemplate, course.title),
    desc: course.desc || copy.defaultDesc,
    action: t.shared.courseAction[status] || t.shared.courseAction.not_started,
  };
}

export default function TrainingSpacePage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadTrainingPlan() {
      setIsLoadingPlan(true);
      setPlanError("");

      try {
        const nextPlan = await fetchTrainingMyPlan();
        if (isActive) {
          setTrainingPlan(nextPlan);
        }
      } catch (error) {
        if (isActive) {
          setPlanError(error.message || "培训任务加载失败");
        }
      } finally {
        if (isActive) {
          setIsLoadingPlan(false);
        }
      }
    }

    loadTrainingPlan();

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
  const materialCourses = useMemo(() => {
    return {
      required: requiredPlanItems.map(toCourseCard),
      optional: optionalPlanItems.map(toCourseCard),
    };
  }, [optionalPlanItems, requiredPlanItems]);
  const positionCategories = useMemo(
    () =>
      [
        ...new Set(
          [...materialCourses.required, ...materialCourses.optional]
            .map((course) => course.positionId)
            .filter(Boolean),
        ),
      ].sort(),
    [materialCourses],
  );
  return (
    <TrainingLayout
      pageCopy={{
        zh: { shared: TRAINING_COPY.zh.shared, page: TRAINING_COPY.zh.training },
        en: { shared: TRAINING_COPY.en.shared, page: TRAINING_COPY.en.training },
        fr: { shared: TRAINING_COPY.fr.shared, page: TRAINING_COPY.fr.training },
      }}
    >
      {({ t, styles }) => {
        const requiredCourses = filterCourses(
          materialCourses.required,
          statusFilter,
          categoryFilter,
          positionFilter,
          searchQuery,
        );
        const optionalCourses = filterCourses(
          materialCourses.optional,
          "all",
          categoryFilter,
          positionFilter,
          searchQuery,
        );
        const hasActiveFilters =
          statusFilter !== "all" ||
          categoryFilter !== "all" ||
          positionFilter !== "all" ||
          Boolean(searchQuery.trim());
        const continueCourse =
          materialCourses.required.find(
            (course) => course.status !== "completed",
          ) ??
          materialCourses.required[0] ??
          null;
        const continueHref = continueCourse
          ? `/dashboard/training/materials/player?id=${continueCourse.materialId}`
          : "/dashboard/training";
        const onboardingContent = buildOnboardingContent(continueCourse, t);

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
                    岗位管理
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
              <section className={styles.uploadMessageError}>
                培训任务加载失败：{planError}
              </section>
            ) : null}

            <section
              className={styles.courseCategoryBar}
              aria-label={t.shared.courseFiltersLabel}
            >
              <div className={styles.courseFilterGroup}>
                <span className={styles.courseCategoryLabel}>
                  {t.shared.materialCategoryLabel}
                </span>
                <div
                  className={styles.filterButtons}
                  role="group"
                  aria-label={t.shared.materialCategoryLabel}
                >
                  {MATERIAL_CATEGORY_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.filterButton} ${
                        categoryFilter === type ? styles.filterButtonActive : ""
                      }`}
                      onClick={() => setCategoryFilter(type)}
                    >
                      {t.shared.materialFilters[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.courseFilterGroup}>
                <span className={styles.courseCategoryLabel}>
                  {t.shared.positionCategoryLabel}
                </span>
                <div
                  className={styles.filterButtons}
                  role="group"
                  aria-label={t.shared.positionCategoryLabel}
                >
                  <button
                    type="button"
                    className={`${styles.filterButton} ${
                      positionFilter === "all" ? styles.filterButtonActive : ""
                    }`}
                    onClick={() => setPositionFilter("all")}
                  >
                    {t.shared.allPositionsLabel}
                  </button>
                  {positionCategories.map((positionId) => (
                    <button
                      key={positionId}
                      type="button"
                      className={`${styles.filterButton} ${
                        positionFilter === positionId ? styles.filterButtonActive : ""
                      }`}
                      onClick={() => setPositionFilter(positionId)}
                    >
                      {positionId}
                    </button>
                  ))}
                </div>
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

            <section className={styles.section}>
              <div className={styles.sectionBar}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionCounter}>01</span>
                  <span>{t.page.requiredHeading}</span>
                  <span className={styles.sectionTitleEn}>{t.page.requiredEn}</span>
                </h2>
                <div
                  className={styles.filterButtons}
                  role="group"
                  aria-label="按学习进度筛选"
                >
                  {Object.entries(t.shared.courseFilters).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.filterButton} ${
                        statusFilter === value ? styles.filterButtonActive : ""
                      }`}
                      onClick={() => setStatusFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.courseGrid}>
                {isLoadingPlan ? (
                  <div className={styles.materialEmpty}>正在加载培训资料...</div>
                ) : planError ? (
                  <div className={styles.materialEmpty}>资料加载失败，请稍后重试。</div>
                ) : requiredCourses.length > 0 ? (
                  requiredCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/dashboard/training/materials/player?id=${course.materialId}`}
                      className={styles.courseCard}
                    >
                      <div
                        className={`${styles.courseCover} ${
                          styles[`courseCover${course.type}`] ||
                          styles.courseCoverOTHER
                        }`}
                      >
                        <span className={styles.courseKind}>
                          {COURSE_KIND_LABELS[course.type]}
                        </span>
                        {course.req ? (
                          <span className={styles.courseReq}>
                            必修 · REQUIRED
                          </span>
                        ) : null}
                        <span className={styles.courseGlyph}>
                          {COURSE_GLYPHS[course.type]}
                        </span>
                        {course.type === "VIDEO" ? (
                          <span className={styles.coursePlay}>▶</span>
                        ) : null}
                        <span className={styles.courseDuration}>
                          {course.dur}
                        </span>
                      </div>
                      <div className={styles.courseBody}>
                        <h3 className={styles.courseTitle}>
                          {course.title}
                          <span className={styles.courseTitleEn}>
                            {course.en}
                          </span>
                        </h3>
                        <p className={styles.courseDesc}>{course.desc}</p>
                        <div className={styles.courseTags}>
                          {course.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className={styles.courseProgress}>
                        <div className={styles.courseProgressBar}>
                          <i style={{ width: `${course.prog}%` }} />
                        </div>
                        <div className={styles.courseStatus}>
                          {t.shared.courseStatus[course.status]}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className={styles.materialEmpty}>
                    {hasActiveFilters
                      ? t.shared.empty
                      : "暂无必修资料。请在资料库上传并标记为必修。"}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionBar}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionCounter}>02</span>
                  <span>{t.page.optionalHeading}</span>
                  <span className={styles.sectionTitleEn}>{t.page.optionalEn}</span>
                </h2>
              </div>
              <div className={styles.courseGrid}>
                {isLoadingPlan ? (
                  <div className={styles.materialEmpty}>正在加载培训资料...</div>
                ) : planError ? (
                  <div className={styles.materialEmpty}>资料加载失败，请稍后重试。</div>
                ) : optionalCourses.length > 0 ? (
                  optionalCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/dashboard/training/materials/player?id=${course.materialId}`}
                      className={styles.courseCard}
                    >
                      <div
                        className={`${styles.courseCover} ${
                          styles[`courseCover${course.type}`] ||
                          styles.courseCoverOTHER
                        }`}
                      >
                        <span className={styles.courseKind}>
                          {COURSE_KIND_LABELS[course.type]}
                        </span>
                        <span className={styles.courseGlyph}>
                          {COURSE_GLYPHS[course.type]}
                        </span>
                        {course.type === "VIDEO" ? (
                          <span className={styles.coursePlay}>▶</span>
                        ) : null}
                        <span className={styles.courseDuration}>
                          {course.dur}
                        </span>
                      </div>
                      <div className={styles.courseBody}>
                        <h3 className={styles.courseTitle}>
                          {course.title}
                          <span className={styles.courseTitleEn}>
                            {course.en}
                          </span>
                        </h3>
                        <p className={styles.courseDesc}>{course.desc}</p>
                        <div className={styles.courseTags}>
                          {course.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className={styles.courseProgress}>
                        <div className={styles.courseProgressBar}>
                          <i style={{ width: `${course.prog}%` }} />
                        </div>
                        <div className={styles.courseStatus}>
                          {t.shared.courseStatus[course.status]}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className={styles.materialEmpty}>
                    {hasActiveFilters
                      ? t.shared.empty
                      : "暂无选修资料。员工仍可先完成上方必修内容。"}
                  </div>
                )}
              </div>
            </section>
          </>
        );
      }}
    </TrainingLayout>
  );
}
