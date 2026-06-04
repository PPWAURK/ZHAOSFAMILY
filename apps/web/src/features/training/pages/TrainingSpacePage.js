"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import { updatePermissionUserJobRole } from "@/features/permissions/services/permissionsApi";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  fetchTrainingMyPlan,
  fetchTrainingStoreProgress,
} from "@/features/training/services/trainingMediaApi";
import {
  TRAINING_POSITION_MANAGE_PERMISSION,
} from "@/features/training/utils/trainingPositions";

const TRAINING_STORE_PROGRESS_PERMISSION = "training.progress.view_store";
const EMPLOYEE_JOB_ROLE_MANAGE_PERMISSION = "employee.job_role.manage_store";
const STORE_JOB_ROLE_OPTIONS = [
  ["front-of-house", "前厅"],
  ["back-of-house", "后厨"],
  ["cash", "收银"],
  ["all-rounder", "通岗"],
  ["store-manager", "店长"],
  ["regional-manager", "区域经理"],
];
const STORE_JOB_ROLE_VALUES = new Set(
  STORE_JOB_ROLE_OPTIONS.map(([value]) => value),
);

function getUserRoleValues(user) {
  return `${user?.jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function getJobRoleValues(jobRole) {
  return `${jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

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
  const status = material.progress?.status || "not_started";
  const progressPct = Number(material.progress?.progressPct ?? 0);

  return {
    id: `material-${material.id}`,
    materialId: material.id,
    type: material.type,
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

function formatDate(iso) {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

export default function TrainingSpacePage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [storeProgress, setStoreProgress] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState("");
  const [storeProgressError, setStoreProgressError] = useState("");
  const [draftJobRolesByUserId, setDraftJobRolesByUserId] = useState({});
  const [savingJobRoleUserId, setSavingJobRoleUserId] = useState(null);

  const roleValues = getUserRoleValues(user);
  const isHoldingUser = roleValues.includes("holding");
  const canViewStoreProgress =
    !isHoldingUser &&
    (roleValues.includes("store-manager") ||
      roleValues.includes("regional-manager") ||
      user?.permissions?.includes(TRAINING_STORE_PROGRESS_PERMISSION));
  const canManageStoreJobRoles =
    !isHoldingUser &&
    (roleValues.includes("store-manager") ||
      roleValues.includes("regional-manager") ||
      user?.permissions?.includes(EMPLOYEE_JOB_ROLE_MANAGE_PERMISSION));

  useEffect(() => {
    let isActive = true;

    async function loadTrainingPlan() {
      setIsLoadingPlan(true);
      setPlanError("");
      setStoreProgressError("");

      try {
        const nextPlan = await fetchTrainingMyPlan();
        if (isActive) {
          setTrainingPlan(nextPlan);
        }

        if (canViewStoreProgress) {
          try {
            const nextStoreProgress = await fetchTrainingStoreProgress();
            if (isActive) {
              setStoreProgress(nextStoreProgress);
              setDraftJobRolesByUserId(
                Object.fromEntries(
                  (nextStoreProgress.users || []).map((employee) => [
                    employee.userId,
                    getJobRoleValues(employee.jobRole),
                  ]),
                ),
              );
            }
          } catch (error) {
            if (isActive) {
              setStoreProgress(null);
              setStoreProgressError(error.message || "本店进度加载失败");
            }
          }
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
  }, [canViewStoreProgress]);

  function updateDraftJobRoles(userId, roleValue) {
    setDraftJobRolesByUserId((current) => {
      const selectedRoles = current[userId] || [];
      const nextRoles = selectedRoles.includes(roleValue)
        ? selectedRoles.filter((item) => item !== roleValue)
        : [...selectedRoles, roleValue];

      return {
        ...current,
        [userId]: nextRoles,
      };
    });
  }

  async function saveEmployeeJobRoles(userId) {
    const nextRoles = draftJobRolesByUserId[userId] || [];

    if (nextRoles.length === 0) {
      setStoreProgressError("至少保留一个岗位");
      return;
    }

    setSavingJobRoleUserId(userId);
    setStoreProgressError("");

    try {
      await updatePermissionUserJobRole(userId, nextRoles.join(","));
      const nextStoreProgress = await fetchTrainingStoreProgress();
      setStoreProgress(nextStoreProgress);
      setDraftJobRolesByUserId(
        Object.fromEntries(
          (nextStoreProgress.users || []).map((employee) => [
            employee.userId,
            getJobRoleValues(employee.jobRole),
          ]),
        ),
      );
    } catch (error) {
      setStoreProgressError(error.message || "岗位保存失败");
    } finally {
      setSavingJobRoleUserId(null);
    }
  }

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
  const filteredStoreUsers = useMemo(() => {
    const users = storeProgress?.users ?? [];

    if (storeFilter === "completed") {
      return users.filter(
        (employee) =>
          employee.requiredTotal > 0 && employee.completionPercent === 100,
      );
    }

    if (storeFilter === "incomplete") {
      return users.filter((employee) => employee.completionPercent < 100);
    }

    return users;
  }, [storeFilter, storeProgress]);

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

            {planError ? (
              <section className={styles.uploadMessageError}>
                培训任务加载失败：{planError}
              </section>
            ) : null}

            {canViewStoreProgress ? (
              <section className={styles.section}>
                <div className={styles.sectionBar}>
                  <h2 className={styles.sectionTitle}>
                    <span className={styles.sectionCounter}>00</span>
                    <span>本店进度</span>
                    <span className={styles.sectionTitleEn}>
                      Store training progress
                    </span>
                  </h2>
                  <div className={styles.filterButtons}>
                    {[
                      ["all", "全部"],
                      ["incomplete", "未完成"],
                      ["completed", "已完成"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.filterButton} ${
                          storeFilter === value ? styles.filterButtonActive : ""
                        }`}
                        onClick={() => setStoreFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {storeProgressError ? (
                  <div className={styles.materialEmpty}>
                    本店进度暂时不可用：{storeProgressError}
                  </div>
                ) : storeProgress ? (
                  <>
                    <div className={styles.storeProgressSummary}>
                      <span>{storeProgress.restaurant.name}</span>
                      <strong>
                        {storeProgress.summary.averageCompletionPercent}%
                      </strong>
                      <span>
                        {storeProgress.summary.completedEmployeeCount}/
                        {storeProgress.summary.employeeCount} 人完成必修
                      </span>
                    </div>
                    <div className={styles.storeProgressTableWrap}>
                      <table className={styles.storeProgressTable}>
                        <thead>
                          <tr>
                            <th>员工</th>
                            <th>岗位</th>
                            <th>必修完成</th>
                            <th>完成率</th>
                            <th>最近学习</th>
                            {canManageStoreJobRoles ? <th>操作</th> : null}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStoreUsers.map((employee) => {
                            const selectedRoles =
                              draftJobRolesByUserId[employee.userId] ||
                              getJobRoleValues(employee.jobRole);
                            const isSaving =
                              savingJobRoleUserId === employee.userId;
                            const canEditEmployeeJobRoles =
                              canManageStoreJobRoles &&
                              selectedRoles.every((role) =>
                                STORE_JOB_ROLE_VALUES.has(role),
                              );

                            return (
                              <tr key={employee.userId}>
                                <td>
                                  <strong>{employee.name}</strong>
                                  <span>{employee.email}</span>
                                </td>
                                <td>
                                  {canEditEmployeeJobRoles ? (
                                    <div className={styles.jobRoleEditor}>
                                      {STORE_JOB_ROLE_OPTIONS.map(
                                        ([value, label]) => {
                                          const isSelected =
                                            selectedRoles.includes(value);

                                          return (
                                            <button
                                              key={value}
                                              type="button"
                                              className={`${styles.jobRolePill} ${
                                                isSelected
                                                  ? styles.jobRolePillActive
                                                  : ""
                                              }`}
                                              disabled={isSaving}
                                              onClick={() =>
                                                updateDraftJobRoles(
                                                  employee.userId,
                                                  value,
                                                )
                                              }
                                            >
                                              {label}
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                  ) : canManageStoreJobRoles ? (
                                    <span className={styles.jobRoleReadOnly}>
                                      {employee.jobRole || "-"}
                                      <small>非门店岗位由总部管理</small>
                                    </span>
                                  ) : (
                                    employee.jobRole || "-"
                                  )}
                                </td>
                                <td>
                                  {employee.requiredCompleted}/
                                  {employee.requiredTotal}
                                </td>
                                <td>{employee.completionPercent}%</td>
                                <td>{formatDate(employee.lastOpenedAt)}</td>
                                {canManageStoreJobRoles ? (
                                  <td>
                                    {canEditEmployeeJobRoles ? (
                                      <button
                                        type="button"
                                        className={styles.permissionSaveButton}
                                        disabled={isSaving}
                                        onClick={() =>
                                          saveEmployeeJobRoles(employee.userId)
                                        }
                                      >
                                        {isSaving ? "保存中" : "保存"}
                                      </button>
                                    ) : (
                                      <span className={styles.jobRoleReadOnly}>
                                        总部
                                      </span>
                                    )}
                                  </td>
                                ) : null}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {filteredStoreUsers.length === 0 ? (
                      <div className={styles.materialEmpty}>
                        当前筛选下没有员工。
                      </div>
                    ) : null}
                  </>
                ) : isLoadingPlan ? (
                  <div className={styles.materialEmpty}>正在加载本店进度...</div>
                ) : null}
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
                    暂无必修资料。请在资料库上传并标记为必修。
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
                    暂无选修资料。员工仍可先完成上方必修内容。
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
