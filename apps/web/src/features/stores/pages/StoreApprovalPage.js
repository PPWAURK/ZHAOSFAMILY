"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import {
  fetchApprovablePermissionUsers,
  updatePermissionUserApproval,
  updatePermissionUserJobRole,
} from "@/features/permissions/services/permissionsApi";
import { STORES_COPY } from "@/features/stores/constants/stores-copy";
import { fetchStoresPageStores } from "@/features/stores/services/restaurantsApi";
import {
  formatJobRoleLabel,
  getOrganizationJobRoleGroups,
  getStoreJobRoleGroups,
  normalizeJobRoleString,
  normalizeJobRoleValues,
  parseJobRoleValues,
} from "@/shared/constants/job-roles";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/stores/stores-page.module.css";

function getStoreIdParam(params) {
  const value = params?.storeId;

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function isUserInStore(user, storeId) {
  return String(user.restaurant?.id ?? "") === String(storeId);
}

function formatStatus(status, labels) {
  return labels.status[status] || status || "-";
}

function getDefaultReviewDraft(user, storeId) {
  return {
    restaurantId: String(user.restaurant?.id ?? storeId),
    jobRole: normalizeJobRoleString(user.jobRole),
  };
}

function getJobRoleValues(user) {
  return `${user?.jobRole || user?.position || user?.role || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function canManageHoldingJobRole(user) {
  const roleValues = getJobRoleValues(user);

  return (
    roleValues.includes("holding") ||
    (user?.permissions || []).includes("system.permission.manage")
  );
}

function toggleJobRoleValue(jobRole, value) {
  const values = parseJobRoleValues(jobRole);
  const nextValues = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

  return normalizeJobRoleValues(nextValues).join(",");
}

function StoreSelect({ ariaLabel, disabled, onChange, options, value }) {
  return (
    <select
      aria-label={ariaLabel}
      className={styles.approvalSelect}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function JobRoleGroupPicker({ disabled, groups, labels, onChange, value }) {
  const selectedValues = parseJobRoleValues(value);

  return (
    <div className={styles.jobRoleGroupPicker}>
      {groups.map((group) => (
        <div className={styles.jobRoleGroup} key={group.id}>
          <span className={styles.jobRoleGroupLabel}>{group.label}</span>
          <div className={styles.jobRoleOptionGrid}>
            {group.options.map((option) => {
              const isSelected = selectedValues.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`${labels.selectJobRole}: ${option.label}`}
                  className={`${styles.jobRoleOption} ${
                    isSelected ? styles.jobRoleOptionSelected : ""
                  }`}
                  disabled={disabled}
                  onClick={() => onChange(toggleJobRoleValue(value, option.value))}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingUserTable({
  drafts,
  emptyText,
  labels,
  onPatchDraft,
  onReviewUser,
  reviewingUserId,
  roleGroups,
  stores,
  users,
}) {
  if (users.length === 0) {
    return <div className={styles.statePanel}>{emptyText}</div>;
  }

  return (
    <div className={styles.approvalTableWrap}>
      <table className={styles.approvalTable}>
        <thead>
          <tr>
            <th>{labels.table.name}</th>
            <th>{labels.table.email}</th>
            <th>{labels.table.store}</th>
            <th>{labels.table.jobRole}</th>
            <th>{labels.table.status}</th>
            <th>{labels.table.action}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const draft = drafts[String(user.id)] ?? getDefaultReviewDraft(user, "");
            const isReviewing = reviewingUserId === user.id;

            return (
              <tr key={user.id}>
                <td>{user.name || "-"}</td>
                <td>{user.email || "-"}</td>
                <td>
                  <StoreSelect
                    ariaLabel={labels.selectStore}
                    disabled={isReviewing}
                    value={draft.restaurantId}
                    options={stores.map((store) => ({
                      value: store.id,
                      label: store.name,
                    }))}
                    onChange={(value) =>
                      onPatchDraft(user.id, { restaurantId: value })
                    }
                  />
                </td>
                <td>
                  <JobRoleGroupPicker
                    disabled={isReviewing}
                    groups={roleGroups}
                    labels={labels}
                    value={draft.jobRole}
                    onChange={(value) => onPatchDraft(user.id, { jobRole: value })}
                  />
                </td>
                <td>{formatStatus(user.accountStatus, labels)}</td>
                <td>
                  <div className={styles.approvalActions}>
                    <button
                      type="button"
                      className={styles.approvalButton}
                      disabled={isReviewing || !draft.jobRole}
                      onClick={() => onReviewUser(user.id, "approved")}
                    >
                      {isReviewing ? labels.reviewing : labels.approve}
                    </button>
                    <button
                      type="button"
                      className={`${styles.approvalButton} ${styles.approvalButtonMuted}`}
                      disabled={isReviewing}
                      onClick={() => onReviewUser(user.id, "rejected")}
                    >
                      {labels.reject}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamUserTable({
  emptyText,
  lang,
  labels,
  onPatchTeamDraft,
  onSaveJobRole,
  roleGroups,
  savingUserId,
  teamDrafts,
  users,
}) {
  if (users.length === 0) {
    return <div className={styles.statePanel}>{emptyText}</div>;
  }

  return (
    <div className={styles.approvalTableWrap}>
      <table className={styles.approvalTable}>
        <thead>
          <tr>
            <th>{labels.table.name}</th>
            <th>{labels.table.email}</th>
            <th>{labels.table.jobRole}</th>
            <th>{labels.table.status}</th>
            <th>{labels.table.action}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const draftJobRole =
              teamDrafts[String(user.id)] ?? normalizeJobRoleString(user.jobRole);
            const isApproved = user.accountStatus === "approved";
            const isSaving = savingUserId === user.id;
            const hasChanged =
              normalizeJobRoleString(draftJobRole) !==
              normalizeJobRoleString(user.jobRole);

            return (
              <tr key={user.id}>
                <td>{user.name || "-"}</td>
                <td>{user.email || "-"}</td>
                <td>
                  {isApproved ? (
                    <JobRoleGroupPicker
                      disabled={isSaving}
                      groups={roleGroups}
                      labels={labels}
                      value={draftJobRole}
                      onChange={(value) => onPatchTeamDraft(user.id, value)}
                    />
                  ) : (
                    formatJobRoleLabel(user.jobRole, lang)
                  )}
                </td>
                <td>{formatStatus(user.accountStatus, labels)}</td>
                <td>
                  {isApproved ? (
                    <button
                      type="button"
                      className={styles.approvalButton}
                      disabled={isSaving || !draftJobRole || !hasChanged}
                      onClick={() => onSaveJobRole(user.id)}
                    >
                      {isSaving ? labels.savingRole : labels.saveRole}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function StoreApprovalPage() {
  const { user } = useAuth();
  const params = useParams();
  const storeId = getStoreIdParam(params);
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [store, setStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [teamDrafts, setTeamDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reviewingUserId, setReviewingUserId] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);

  const t = STORES_COPY[lang];
  const page = t.approval;
  const roleGroups = canManageHoldingJobRole(user)
    ? getOrganizationJobRoleGroups(lang)
    : getStoreJobRoleGroups(lang);
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  const storeUsers = useMemo(
    () => users.filter((user) => isUserInStore(user, storeId)),
    [storeId, users],
  );
  const pendingUsers = useMemo(
    () => storeUsers.filter((user) => user.accountStatus === "pending"),
    [storeUsers],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadApprovalData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const [nextStores, nextUsers] = await Promise.all([
          fetchStoresPageStores(),
          fetchApprovablePermissionUsers(),
        ]);

        if (isCancelled) {
          return;
        }

        const nextStore =
          nextStores.find((item) => String(item.id) === String(storeId)) ?? null;
        const nextDrafts = {};
        const nextTeamDrafts = {};

        nextUsers.forEach((user) => {
          if (!isUserInStore(user, storeId)) {
            return;
          }

          if (user.accountStatus === "pending") {
            nextDrafts[String(user.id)] = getDefaultReviewDraft(user, storeId);
          }

          if (user.accountStatus === "approved") {
            nextTeamDrafts[String(user.id)] = normalizeJobRoleString(user.jobRole);
          }
        });

        setStores(nextStores);
        setStore(nextStore);
        setUsers(nextUsers);
        setReviewDrafts(nextDrafts);
        setTeamDrafts(nextTeamDrafts);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStore(null);
        setStores([]);
        setUsers([]);
        setErrorMessage(error instanceof Error ? error.message : page.loadError);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadApprovalData();

    return () => {
      isCancelled = true;
    };
  }, [page.loadError, storeId]);

  function patchReviewDraft(userId, patch) {
    setErrorMessage("");
    setSuccessMessage("");
    setReviewDrafts((current) => ({
      ...current,
      [String(userId)]: {
        ...(current[String(userId)] ?? {}),
        ...patch,
      },
    }));
  }

  function patchTeamDraft(userId, jobRole) {
    setErrorMessage("");
    setSuccessMessage("");
    setTeamDrafts((current) => ({
      ...current,
      [String(userId)]: jobRole,
    }));
  }

  async function reviewUser(userId, accountStatus) {
    const draft = reviewDrafts[String(userId)] ?? {};
    setReviewingUserId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedUser = await updatePermissionUserApproval(
        String(userId),
        accountStatus,
        accountStatus === "approved"
          ? {
              restaurantId: Number(draft.restaurantId),
              jobRole: draft.jobRole,
            }
          : {},
      );

      setUsers((current) =>
        current.map((item) =>
          String(item.id) === String(userId) ? updatedUser : item,
        ),
      );
      setReviewDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[String(userId)];
        return nextDrafts;
      });
      if (updatedUser.accountStatus === "approved") {
        setTeamDrafts((current) => ({
          ...current,
          [String(updatedUser.id)]: normalizeJobRoleString(updatedUser.jobRole),
        }));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : page.loadError);
    } finally {
      setReviewingUserId(null);
    }
  }

  async function saveJobRole(userId) {
    const nextJobRole = teamDrafts[String(userId)];

    if (!nextJobRole) {
      return;
    }

    setSavingUserId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedUser = await updatePermissionUserJobRole(
        String(userId),
        nextJobRole,
      );

      setUsers((current) =>
        current.map((item) =>
          String(item.id) === String(userId) ? updatedUser : item,
        ),
      );
      setTeamDrafts((current) => ({
        ...current,
        [String(updatedUser.id)]: normalizeJobRoleString(updatedUser.jobRole),
      }));
      setSuccessMessage(page.roleSaved);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : page.roleSaveError);
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <button
            type="button"
            className={`${styles.menuToggle} ${menuOpen ? styles.menuToggleOpen : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={styles.menuToggleIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {menuOpen ? menuLabels.close : menuLabels.open}
          </button>

          <div className={styles.topIndex}>
            <span>
              <span className={styles.topIndexBold}>ZHAO</span>
              &nbsp;/&nbsp;{t.topFamily}
            </span>
            <span>{page.topStage}</span>
            <span>{store?.storeCode || storeId}</span>
          </div>
        </div>

        <div className={styles.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={styles.topLangSep}>/</span> : null}
              <button
                type="button"
                className={`${styles.topLangBtn} ${
                  lang === option.value ? styles.topLangBtnActive : ""
                }`}
                onClick={() => setLang(option.value)}
              >
                {option.label}
              </button>
            </Fragment>
          ))}
        </div>
      </header>

      <motion.section
        className={styles.main}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.kicker}>
          <span className={styles.kickerDot} />
          {page.kicker}
        </p>

        <h1 className={styles.title}>
          {page.titlePrefix}
          <span className={styles.titleEm}>{store?.name || storeId}</span>
          {page.titleSuffix}
        </h1>

        <p className={styles.lede}>{page.lede}</p>

        {errorMessage ? (
          <div className={styles.statePanel} role="alert">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className={styles.statePanel} role="status">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? <div className={styles.statePanel}>{page.loading}</div> : null}

        {!isLoading && !errorMessage && !store ? (
          <div className={styles.statePanel}>{page.storeNotFound}</div>
        ) : null}

        {!isLoading && !errorMessage && store ? (
          <>
            <section className={styles.approvalSummary}>
              <article>
                <span>{page.pendingHeading}</span>
                <strong>{pendingUsers.length}</strong>
              </article>
              <article>
                <span>{page.teamHeading}</span>
                <strong>{storeUsers.length}</strong>
              </article>
              <article>
                <span>{t.codeLabel}</span>
                <strong>{store.storeCode}</strong>
              </article>
            </section>

            <p className={styles.listHeading}>
              <span>{page.pendingHeading}</span>
              <span className={styles.listHeadingCount}>{pendingUsers.length}</span>
            </p>
            <PendingUserTable
              drafts={reviewDrafts}
              emptyText={page.noPending}
              labels={page}
              reviewingUserId={reviewingUserId}
              roleGroups={roleGroups}
              stores={stores}
              users={pendingUsers}
              onPatchDraft={patchReviewDraft}
              onReviewUser={reviewUser}
            />

            <p className={styles.listHeading}>
              <span>{page.teamHeading}</span>
              <span className={styles.listHeadingCount}>{storeUsers.length}</span>
            </p>
            <TeamUserTable
              emptyText={page.noTeam}
              lang={lang}
              labels={page}
              roleGroups={roleGroups}
              savingUserId={savingUserId}
              teamDrafts={teamDrafts}
              users={storeUsers}
              onPatchTeamDraft={patchTeamDraft}
              onSaveJobRole={saveJobRole}
            />
          </>
        ) : null}

        <div className={styles.backRow}>
          <Link href="/dashboard/stores" className={styles.backLink}>
            ← {page.backToStores}
          </Link>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
