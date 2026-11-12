"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { updatePermissionUserJobRole } from "@/features/permissions/services/permissionsApi";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import { fetchTrainingStoreProgress } from "@/features/training/services/trainingMediaApi";
import {
  canEditStoreJobRoles,
  formatProgressDate,
  getJobRoleValues,
  getProgressScope,
  getUserRoleValues,
  groupUsersByStore,
  matchesEmployeeSearch,
} from "@/features/training/utils/trainingProgressView";
import {
  formatJobRoleLabel,
  getStoreJobRoleGroups,
  normalizeJobRoleValues,
} from "@/shared/constants/job-roles";

export default function TrainingProgressPage() {
  const { user } = useAuth();
  const [storeProgress, setStoreProgress] = useState(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  // { message, fallbackKey }: message comes from the API, fallbackKey is localized at render time.
  const [storeProgressError, setStoreProgressError] = useState(null);
  const [storeFilter, setStoreFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [draftJobRolesByUserId, setDraftJobRolesByUserId] = useState({});
  const [savingJobRoleUserId, setSavingJobRoleUserId] = useState(null);
  const roleValues = getUserRoleValues(user);
  const progressScope = getProgressScope(roleValues);

  useEffect(() => {
    let isActive = true;

    async function loadStoreProgress() {
      if (!progressScope.canView) {
        setIsLoadingProgress(false);
        return;
      }

      setIsLoadingProgress(true);
      setStoreProgressError(null);

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
          setStoreProgressError({
            message: error.message,
            fallbackKey: "loadFailed",
          });
        }
      } finally {
        if (isActive) {
          setIsLoadingProgress(false);
        }
      }
    }

    void loadStoreProgress();

    return () => {
      isActive = false;
    };
  }, [progressScope.canView]);

  function updateDraftJobRoles(userId, roleValue) {
    setDraftJobRolesByUserId((current) => {
      const selectedRoles = current[userId] || [];
      const nextRoles = selectedRoles.includes(roleValue)
        ? selectedRoles.filter((item) => item !== roleValue)
        : normalizeJobRoleValues([...selectedRoles, roleValue]);

      return {
        ...current,
        [userId]: nextRoles,
      };
    });
  }

  async function saveEmployeeJobRoles(userId) {
    const nextRoles = draftJobRolesByUserId[userId] || [];

    if (nextRoles.length === 0) {
      setStoreProgressError({ fallbackKey: "keepOneRole" });
      return;
    }

    setSavingJobRoleUserId(userId);
    setStoreProgressError(null);

    try {
      await updatePermissionUserJobRole(userId, nextRoles.join(","));
      const nextStoreProgress = await fetchTrainingStoreProgress();
      setStoreProgress(nextStoreProgress);
      setDraftJobRolesByUserId(
        Object.fromEntries(
          (nextStoreProgress.users || []).map((employee) => [
            employee.userId,
            normalizeJobRoleValues(getJobRoleValues(employee.jobRole)),
          ]),
        ),
      );
    } catch (error) {
      setStoreProgressError({
        message: error.message,
        fallbackKey: "saveFailed",
      });
    } finally {
      setSavingJobRoleUserId(null);
    }
  }

  const storeGroups = useMemo(() => groupUsersByStore(storeProgress?.users ?? []), [storeProgress]);
  const filteredStoreGroups = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();

    return storeGroups
      .filter((group) => storeFilter === "all" || group.id === storeFilter)
      .map((group) => {
        const users = group.users.filter((employee) => {
          const matchesStatus =
            completionFilter === "all" ||
            (completionFilter === "completed" &&
              employee.requiredTotal > 0 &&
              employee.completionPercent === 100) ||
            (completionFilter === "incomplete" && employee.completionPercent < 100);

          return matchesStatus && matchesEmployeeSearch(employee, query);
        });

        return {
          ...group,
          users,
        };
      })
      .filter((group) => group.users.length > 0);
  }, [completionFilter, employeeSearch, storeFilter, storeGroups]);
  const filteredUserCount = filteredStoreGroups.reduce((sum, group) => sum + group.users.length, 0);

  return (
    <TrainingLayout
      pageCopy={{
        zh: { shared: TRAINING_COPY.zh.shared, page: TRAINING_COPY.zh.progress },
        en: { shared: TRAINING_COPY.en.shared, page: TRAINING_COPY.en.progress },
        fr: { shared: TRAINING_COPY.fr.shared, page: TRAINING_COPY.fr.progress },
      }}
    >
      {({ lang, t, styles }) => {
        const storeJobRoleGroups = getStoreJobRoleGroups(lang);
        const scopeCopy = t.page.scope[progressScope.key];
        const getGroupName = (group) =>
          group.isUnassigned ? t.page.messages.unassignedStore : group.name;
        const fillTemplate = (template, values) =>
          Object.entries(values).reduce(
            (text, [key, value]) => text.replace(`{${key}}`, String(value)),
            template,
          );

        return (
          <>
            <section className={styles.pageHeaderCard}>
              <div>
                <p className={styles.pageStep}>
                  <span className={styles.stepBadge}>PROGRESS</span>
                  <span>{scopeCopy.subtitle}</span>
                </p>
              </div>
              <div className={styles.metricGrid}>
                <article className={styles.metricCard}>
                  <p className={styles.metricValue}>
                    {storeProgress?.summary?.averageCompletionPercent ?? 0}%
                  </p>
                  <p className={styles.metricLabel}>AVERAGE</p>
                </article>
                <article className={styles.metricCard}>
                  <p className={styles.metricValue}>
                    {storeProgress?.summary?.completedEmployeeCount ?? 0}/
                    {storeProgress?.summary?.employeeCount ?? 0}
                  </p>
                  <p className={styles.metricLabel}>COMPLETED</p>
                </article>
                <article className={styles.metricCard}>
                  <p className={styles.metricValue}>{filteredUserCount}</p>
                  <p className={styles.metricLabel}>CURRENT VIEW</p>
                </article>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionBar}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionCounter}>00</span>
                  <span>{scopeCopy.title}</span>
                  <span className={styles.sectionTitleEn}>{scopeCopy.subtitle}</span>
                </h2>
                <div className={styles.filterButtons}>
                  <select
                    className={styles.positionSearch}
                    value={storeFilter}
                    onChange={(event) => setStoreFilter(event.target.value)}
                  >
                    <option value="all">{t.page.filters.allStores}</option>
                    {storeGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {getGroupName(group)}
                      </option>
                    ))}
                  </select>
                  <input
                    className={styles.positionSearch}
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder={t.page.filters.searchPlaceholder}
                  />
                  {Object.entries(t.page.filters.completion).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.filterButton} ${
                        completionFilter === value ? styles.filterButtonActive : ""
                      }`}
                      onClick={() => setCompletionFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {!progressScope.canView ? (
                <div className={styles.materialEmpty}>{t.page.messages.selfOnly}</div>
              ) : storeProgressError ? (
                <div className={styles.materialEmpty}>
                  {t.page.messages.unavailable}
                  {storeProgressError.message || t.page.messages[storeProgressError.fallbackKey]}
                </div>
              ) : storeProgress ? (
                <>
                  <div className={styles.storeProgressSummary}>
                    <span>{storeProgress.restaurant.name}</span>
                    <strong>{storeProgress.summary.averageCompletionPercent}%</strong>
                    <span>
                      {fillTemplate(t.page.summary.completedRequired, {
                        done: storeProgress.summary.completedEmployeeCount,
                        total: storeProgress.summary.employeeCount,
                      })}
                    </span>
                  </div>

                  {filteredStoreGroups.map((group) => (
                    <div key={group.id} className={styles.storeProgressGroup}>
                      <h3 className={styles.storeProgressGroupTitle}>
                        <span>{getGroupName(group)}</span>
                        <small>
                          {fillTemplate(t.page.summary.people, {
                            count: group.users.length,
                          })}
                        </small>
                      </h3>
                      <div className={styles.storeProgressTableWrap}>
                        <table className={styles.storeProgressTable}>
                          <thead>
                            <tr>
                              <th>{t.page.table.employee}</th>
                              <th>{t.page.table.position}</th>
                              <th>{t.page.table.requiredDone}</th>
                              <th>{t.page.table.rate}</th>
                              <th>{t.page.table.lastStudy}</th>
                              {progressScope.canManageStoreJobRoles ? (
                                <th>{t.page.table.action}</th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody>
                            {group.users.map((employee) => {
                              const selectedRoles =
                                draftJobRolesByUserId[employee.userId] ||
                                normalizeJobRoleValues(getJobRoleValues(employee.jobRole));
                              const isSaving = savingJobRoleUserId === employee.userId;
                              const canEditEmployeeJobRoles =
                                progressScope.canManageStoreJobRoles &&
                                canEditStoreJobRoles(employee.jobRole);

                              return (
                                <tr key={employee.userId}>
                                  <td>
                                    <strong>{employee.name}</strong>
                                    <span>{employee.email}</span>
                                  </td>
                                  <td>
                                    {canEditEmployeeJobRoles ? (
                                      <div className={styles.jobRoleEditor}>
                                        {storeJobRoleGroups.map((roleGroup) => (
                                          <div className={styles.jobRoleGroup} key={roleGroup.id}>
                                            <span>{roleGroup.label}</span>
                                            <div className={styles.jobRolePillRow}>
                                              {roleGroup.options.map((option) => {
                                                const isSelected = selectedRoles.includes(
                                                  option.value,
                                                );

                                                return (
                                                  <button
                                                    key={option.value}
                                                    type="button"
                                                    className={`${styles.jobRolePill} ${
                                                      isSelected ? styles.jobRolePillActive : ""
                                                    }`}
                                                    disabled={isSaving}
                                                    onClick={() =>
                                                      updateDraftJobRoles(
                                                        employee.userId,
                                                        option.value,
                                                      )
                                                    }
                                                  >
                                                    {option.label}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : progressScope.canManageStoreJobRoles ? (
                                      <span className={styles.jobRoleReadOnly}>
                                        {formatJobRoleLabel(employee.jobRole, lang)}
                                        <small>{t.page.actions.hqManagedRole}</small>
                                      </span>
                                    ) : (
                                      formatJobRoleLabel(employee.jobRole, lang)
                                    )}
                                  </td>
                                  <td>
                                    {employee.requiredCompleted}/{employee.requiredTotal}
                                  </td>
                                  <td>{employee.completionPercent}%</td>
                                  <td>{formatProgressDate(employee.lastOpenedAt, lang)}</td>
                                  {progressScope.canManageStoreJobRoles ? (
                                    <td>
                                      {canEditEmployeeJobRoles ? (
                                        <button
                                          type="button"
                                          className={styles.permissionSaveButton}
                                          disabled={isSaving}
                                          onClick={() => saveEmployeeJobRoles(employee.userId)}
                                        >
                                          {isSaving ? t.page.actions.saving : t.page.actions.save}
                                        </button>
                                      ) : (
                                        <span className={styles.jobRoleReadOnly}>
                                          {t.page.actions.headquarters}
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
                    </div>
                  ))}

                  {filteredStoreGroups.length === 0 ? (
                    <div className={styles.materialEmpty}>{t.page.filters.noMatches}</div>
                  ) : null}
                </>
              ) : isLoadingProgress ? (
                <div className={styles.materialEmpty}>{t.page.messages.loading}</div>
              ) : null}
            </section>
          </>
        );
      }}
    </TrainingLayout>
  );
}
