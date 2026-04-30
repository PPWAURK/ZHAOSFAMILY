"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import {
  TRAINING_COPY,
} from "@/features/training/constants/training-copy";
import {
  fetchTrainingMaterials,
  fetchTrainingPositions,
} from "@/features/training/services/trainingMediaApi";
import {
  DEFAULT_TRAINING_POSITION_TREE,
  TRAINING_POSITION_MANAGE_PERMISSION,
  getUserTrainingPositionCodes,
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

function filterCourses(items, filter) {
  if (filter === "all") {
    return items;
  }

  return items.filter((item) => item.status === filter);
}

function toCourseCard(material) {
  return {
    id: `material-${material.id}`,
    materialId: material.id,
    type: material.type,
    req: Boolean(material.isRequired),
    title: material.title,
    en: material.positionId,
    dur: material.mimeType || material.type,
    prog: 0,
    status: "not_started",
    desc: material.description || material.originalName,
    tags: [
      material.positionId,
      material.type,
      material.isRequired ? "必修" : "选修",
      material.mimeType || "FILE",
    ],
  };
}

function getMaterialDisplayPriority(material, visiblePositionCodes) {
  if (material.positionId !== "ALL" && visiblePositionCodes.has(material.positionId)) {
    return 0;
  }

  if (material.positionId === "ALL") {
    return 1;
  }

  return 2;
}

export default function TrainingSpacePage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [materials, setMaterials] = useState([]);
  const [positions, setPositions] = useState(DEFAULT_TRAINING_POSITION_TREE);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [materialsError, setMaterialsError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadMaterials() {
      setIsLoadingMaterials(true);
      setMaterialsError("");

      try {
        const [nextMaterials, nextPositions] = await Promise.all([
          fetchTrainingMaterials(),
          fetchTrainingPositions(),
        ]);
        if (isActive) {
          setMaterials(nextMaterials);
          if (nextPositions.length > 0) {
            setPositions(nextPositions);
          }
        }
      } catch (error) {
        if (isActive) {
          setMaterialsError(error.message || "培训资料加载失败");
        }
      } finally {
        if (isActive) {
          setIsLoadingMaterials(false);
        }
      }
    }

    loadMaterials();

    return () => {
      isActive = false;
    };
  }, []);

  const visiblePositionCodes = useMemo(
    () => getUserTrainingPositionCodes(user, positions),
    [user, positions],
  );
  const canManagePositions = user?.permissions?.includes(TRAINING_POSITION_MANAGE_PERMISSION);
  const matchedMaterials = useMemo(
    () => materials.filter((material) => visiblePositionCodes.has(material.positionId)),
    [materials, visiblePositionCodes],
  );
  const metrics = useMemo(
    () => [
      { value: String(matchedMaterials.length), label: "MATCHED ITEMS" },
      {
        value: String(matchedMaterials.filter((material) => material.isRequired).length),
        label: "REQUIRED",
      },
      {
        value: String(matchedMaterials.filter((material) => material.type === "VIDEO").length),
        label: "VIDEOS",
      },
    ],
    [matchedMaterials],
  );
  const materialCourses = useMemo(() => {
    const visibleMaterials = [...matchedMaterials].sort((left, right) => {
      const priorityDiff =
        getMaterialDisplayPriority(left, visiblePositionCodes) -
        getMaterialDisplayPriority(right, visiblePositionCodes);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.id - left.id;
      });

    return {
      required: visibleMaterials
        .filter((material) => material.isRequired)
        .map(toCourseCard),
      optional: visibleMaterials
        .filter((material) => !material.isRequired)
        .map(toCourseCard),
    };
  }, [matchedMaterials, visiblePositionCodes]);

  return (
    <TrainingLayout
      pageCopy={{
        zh: { shared: TRAINING_COPY.zh.shared, page: TRAINING_COPY.zh.training },
        en: { shared: TRAINING_COPY.en.shared, page: TRAINING_COPY.en.training },
        fr: { shared: TRAINING_COPY.fr.shared, page: TRAINING_COPY.fr.training },
      }}
    >
      {({ t, styles }) => {
        const requiredCourses = filterCourses(materialCourses.required, filter);
        const optionalCourses = filterCourses(materialCourses.optional, filter);

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
              <div className={styles.onboardingMark}>新</div>
              <div className={styles.onboardingText}>
                <p className={styles.onboardingKicker}>{t.page.onboardingKicker}</p>
                <h2 className={styles.onboardingTitle}>{t.page.onboardingTitle}</h2>
                <p className={styles.onboardingDetail}>{t.page.onboardingDesc}</p>
              </div>
              <button type="button" className={styles.onboardingAction}>
                <span>{t.page.onboardingAction}</span>
                <span className={styles.onboardingArrow}>→</span>
              </button>
            </section>

            {materialsError ? (
              <section className={styles.uploadMessageError}>
                资料加载失败：{materialsError}
              </section>
            ) : null}

            <section className={styles.section}>
              <div className={styles.sectionBar}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionCounter}>01</span>
                  <span>{t.page.requiredHeading}</span>
                  <span className={styles.sectionTitleEn}>{t.page.requiredEn}</span>
                </h2>
                <div className={styles.filterButtons}>
                  {Object.entries(t.shared.courseFilters).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.filterButton} ${
                        filter === value ? styles.filterButtonActive : ""
                      }`}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.courseGrid}>
                {isLoadingMaterials ? (
                  <div className={styles.materialEmpty}>正在加载培训资料...</div>
                ) : materialsError ? (
                  <div className={styles.materialEmpty}>资料加载失败，请稍后重试。</div>
                ) : requiredCourses.length > 0 ? (
                requiredCourses.map((course) => (
                  <Link key={course.id} href={`/dashboard/training/materials/player?id=${course.materialId}`} className={styles.courseCard}>
                    <div className={`${styles.courseCover} ${styles[`courseCover${course.type}`] || styles.courseCoverOTHER}`}>
                      <span className={styles.courseKind}>
                        {COURSE_KIND_LABELS[course.type]}
                      </span>
                      {course.req ? <span className={styles.courseReq}>必修 · REQUIRED</span> : null}
                      <span className={styles.courseGlyph}>{COURSE_GLYPHS[course.type]}</span>
                      {course.type === "VIDEO" ? <span className={styles.coursePlay}>▶</span> : null}
                      <span className={styles.courseDuration}>{course.dur}</span>
                    </div>
                    <div className={styles.courseBody}>
                      <h3 className={styles.courseTitle}>
                        {course.title}
                        <span className={styles.courseTitleEn}>{course.en}</span>
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
                  <div className={styles.materialEmpty}>暂无资料。</div>
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
                {isLoadingMaterials ? (
                  <div className={styles.materialEmpty}>正在加载培训资料...</div>
                ) : materialsError ? (
                  <div className={styles.materialEmpty}>资料加载失败，请稍后重试。</div>
                ) : optionalCourses.length > 0 ? (
                optionalCourses.map((course) => (
                  <Link key={course.id} href={`/dashboard/training/materials/player?id=${course.materialId}`} className={styles.courseCard}>
                    <div className={`${styles.courseCover} ${styles[`courseCover${course.type}`] || styles.courseCoverOTHER}`}>
                      <span className={styles.courseKind}>
                        {COURSE_KIND_LABELS[course.type]}
                      </span>
                      <span className={styles.courseGlyph}>{COURSE_GLYPHS[course.type]}</span>
                      {course.type === "VIDEO" ? <span className={styles.coursePlay}>▶</span> : null}
                      <span className={styles.courseDuration}>{course.dur}</span>
                    </div>
                    <div className={styles.courseBody}>
                      <h3 className={styles.courseTitle}>
                        {course.title}
                        <span className={styles.courseTitleEn}>{course.en}</span>
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
                  <div className={styles.materialEmpty}>暂无资料。</div>
                )}
              </div>
            </section>
          </>
        );
      }}
    </TrainingLayout>
  );
}
