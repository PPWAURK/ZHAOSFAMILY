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
  removePermissionUser,
  updatePermissionUserApproval,
  updatePermissionUserJobRole,
} from "@/features/permissions/services/permissionsApi";
import {
  STORES_COPY,
  STORE_JOB_ROLE_OPTIONS,
} from "@/features/stores/constants/stores-copy";
import { fetchStoresPageStores } from "@/features/stores/services/restaurantsApi";
import {
  formatJobRoleLabel,
  normalizeJobRoleString,
  normalizeJobRoleValues,
  parseJobRoleValues,
  STORE_ASSIGNABLE_JOB_ROLE_VALUES,
} from "@/shared/constants/job-roles";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider";
import { useToast } from "@/shared/components/toast/ToastProvider";
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

// Mirror mobile: holding/admins may assign any role; store/regional managers
// only the line-staff roles the backend accepts (others get a 403 on save).
function getVisibleRoleOptions(lang, user) {
  const options = STORE_JOB_ROLE_OPTIONS[lang] || STORE_JOB_ROLE_OPTIONS.zh;

  if (canManageHoldingJobRole(user)) {
    return options;
  }

  const assignable = new Set(STORE_ASSIGNABLE_JOB_ROLE_VALUES);

  return options.filter((option) => assignable.has(option.value));
}

function toggleJobRoleValue(jobRole, value) {
  const values = parseJobRoleValues(jobRole);
  const nextValues = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

  return normalizeJobRoleValues(nextValues).join(",");
}

function userMatchesSearch(user, searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return `${user.name || ""} ${user.email || ""}`
    .toLowerCase()
    .includes(normalizedSearch);
}

function userHasRole(user, roleValue) {
  if (!roleValue) return true;

  return parseJobRoleValues(user.jobRole).includes(roleValue);
}

// A vertical switch list — the web mirror of mobile's RoleMultiSelector.
function RoleSwitchList({ disabled, options, value, onChange }) {
  const selectedValues = parseJobRoleValues(value);

  return (
    <div className={styles.roleSelectPanel}>
      {options.map((option) => {
        const isActive = selectedValues.includes(option.value);

        return (
          <label className={styles.roleSwitchRow} key={option.value}>
            <span
              className={`${styles.roleSwitchLabel} ${
                isActive ? styles.roleSwitchLabelActive : ""
              }`}
            >
              {option.label}
            </span>
            <span className={styles.switch}>
              <input
                type="checkbox"
                aria-label={option.label}
                checked={isActive}
                disabled={disabled}
                onChange={() => onChange(toggleJobRoleValue(value, option.value))}
              />
              <span className={styles.switchTrack} aria-hidden="true" />
              <span className={styles.switchThumb} aria-hidden="true" />
            </span>
          </label>
        );
      })}
    </div>
  );
}

function ActionCard({ count, hint, label, onClick }) {
  return (
    <button type="button" className={styles.detailActionCard} onClick={onClick}>
      <span className={styles.detailActionContent}>
        <span className={styles.detailActionLabel}>{label}</span>
        <span className={styles.detailActionHint}>{hint}</span>
      </span>
      <span className={styles.detailActionCount}>{count}</span>
    </button>
  );
}

function PendingUserCard({
  appliedRoleLabel,
  draft,
  isReviewing,
  labels,
  onPatchDraft,
  onReview,
  roleOptions,
  user,
}) {
  return (
    <article className={styles.userCard}>
      <div>
        <p className={styles.userName}>{user.name || "-"}</p>
        <p className={styles.userEmail}>{user.email || "-"}</p>
        <p className={styles.userMeta}>{formatStatus(user.accountStatus, labels)}</p>
        <p className={styles.userMeta}>
          {labels.appliedRole}: {appliedRoleLabel}
        </p>
      </div>
      <RoleSwitchList
        disabled={isReviewing}
        options={roleOptions}
        value={draft.jobRole}
        onChange={onPatchDraft}
      />
      <div className={styles.userCardActions}>
        <button
          type="button"
          className={styles.approvalButton}
          disabled={isReviewing || !draft.jobRole}
          onClick={() => onReview("approved")}
        >
          {isReviewing ? labels.reviewing : labels.approve}
        </button>
        <button
          type="button"
          className={`${styles.approvalButton} ${styles.approvalButtonMuted}`}
          disabled={isReviewing}
          onClick={() => onReview("rejected")}
        >
          {labels.reject}
        </button>
      </div>
    </article>
  );
}

function TeamUserCard({
  draft,
  isRemoving,
  isSaving,
  labels,
  lang,
  onPatchDraft,
  onRemove,
  roleOptions,
  user,
}) {
  const isBusy = isSaving || isRemoving;

  return (
    <article className={styles.userCard}>
      <div className={styles.teamCardHeader}>
        <div className={styles.teamCardIdentity}>
          <p className={styles.userName}>{user.name || "-"}</p>
          <p className={styles.userEmail}>{user.email || "-"}</p>
          <p className={styles.userMeta}>{formatJobRoleLabel(user.jobRole, lang)}</p>
        </div>
        <button
          type="button"
          className={`${styles.approvalButton} ${styles.approvalButtonDanger}`}
          disabled={isBusy}
          onClick={() => onRemove(user)}
        >
          {isRemoving ? labels.removing : labels.remove}
        </button>
      </div>
      <RoleSwitchList
        disabled={isBusy}
        options={roleOptions}
        value={draft}
        onChange={(nextJobRole) => onPatchDraft(user.id, nextJobRole)}
      />
    </article>
  );
}

export default function StoreApprovalPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const params = useParams();
  const storeId = getStoreIdParam(params);
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [store, setStore] = useState(null);
  const [users, setUsers] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [teamDrafts, setTeamDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewingUserId, setReviewingUserId] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [detailView, setDetailView] = useState("overview");
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("");

  const t = STORES_COPY[lang];
  const page = t.approval;
  const roleOptions = useMemo(() => getVisibleRoleOptions(lang, user), [lang, user]);
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  const storeUsers = useMemo(
    () => users.filter((item) => isUserInStore(item, storeId)),
    [storeId, users],
  );
  const pendingUsers = useMemo(
    () => storeUsers.filter((item) => item.accountStatus === "pending"),
    [storeUsers],
  );
  const teamUsers = useMemo(
    () => storeUsers.filter((item) => item.accountStatus === "approved"),
    [storeUsers],
  );
  const activeStoreUsers = useMemo(
    () =>
      storeUsers.filter(
        (item) =>
          item.accountStatus === "pending" || item.accountStatus === "approved",
      ),
    [storeUsers],
  );
  const filteredTeamUsers = useMemo(
    () =>
      teamUsers.filter(
        (item) =>
          userMatchesSearch(item, teamSearchTerm) &&
          userHasRole(item, teamRoleFilter),
      ),
    [teamUsers, teamSearchTerm, teamRoleFilter],
  );
  const roleStats = roleOptions.map((roleOption) => ({
    ...roleOption,
    count: activeStoreUsers.filter((item) =>
      parseJobRoleValues(item.jobRole).includes(roleOption.value),
    ).length,
  }));

  useEffect(() => {
    let isCancelled = false;

    async function loadApprovalData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

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

        nextUsers.forEach((item) => {
          if (!isUserInStore(item, storeId)) {
            return;
          }

          if (item.accountStatus === "pending") {
            nextDrafts[String(item.id)] = { jobRole: "" };
          }

          if (item.accountStatus === "approved") {
            nextTeamDrafts[String(item.id)] = normalizeJobRoleString(item.jobRole);
          }
        });

        setStore(nextStore);
        setUsers(nextUsers);
        setReviewDrafts(nextDrafts);
        setTeamDrafts(nextTeamDrafts);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStore(null);
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

  function patchReviewDraft(userId, jobRole) {
    setErrorMessage("");
    setReviewDrafts((current) => ({
      ...current,
      [String(userId)]: { jobRole },
    }));
  }

  function patchTeamDraft(userId, jobRole) {
    setErrorMessage("");
    setTeamDrafts((current) => ({
      ...current,
      [String(userId)]: jobRole,
    }));
  }

  async function reviewUser(userId, accountStatus) {
    const draft = reviewDrafts[String(userId)] ?? {};
    setReviewingUserId(userId);
    setErrorMessage("");

    try {
      const updatedUser = await updatePermissionUserApproval(
        String(userId),
        accountStatus,
        accountStatus === "approved"
          ? {
              // Assign to the store being reviewed (mirrors mobile — no picker).
              restaurantId: Number(storeId),
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
      toast.error(error instanceof Error ? error.message : page.loadError);
    } finally {
      setReviewingUserId(null);
    }
  }

  async function removeUser(targetUser) {
    const isRejected = targetUser.accountStatus === "rejected";
    const confirmMessage = (
      isRejected ? page.deleteUserConfirm : page.removeConfirm
    ).replace("{name}", targetUser.name || targetUser.email || "");

    if (!(await confirm({ message: confirmMessage, tone: "danger" }))) {
      return;
    }

    setRemovingUserId(targetUser.id);
    setErrorMessage("");

    try {
      await removePermissionUser(String(targetUser.id));

      setUsers((current) =>
        current.filter((item) => String(item.id) !== String(targetUser.id)),
      );
      setTeamDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[String(targetUser.id)];
        return nextDrafts;
      });
      toast.success(isRejected ? page.deleteUserSuccess : page.removeSuccess);
    } catch (error) {
      const fallback = isRejected ? page.deleteUserError : page.removeError;
      toast.error(error instanceof Error ? error.message : fallback);
    } finally {
      setRemovingUserId(null);
    }
  }

  // Auto-saves on every toggle (mirrors mobile — the green switch is the
  // feedback, no explicit save button).
  async function saveJobRole(userId, nextJobRole) {
    if (!nextJobRole) {
      return;
    }

    setSavingUserId(userId);
    setErrorMessage("");

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : page.roleSaveError);
    } finally {
      setSavingUserId(null);
    }
  }

  function openDetailView(nextView) {
    setDetailView(nextView);
    setErrorMessage("");
    if (nextView !== "team") {
      setTeamSearchTerm("");
      setTeamRoleFilter("");
    }
  }

  const isOverview = detailView === "overview";

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

        {isLoading ? <div className={styles.statePanel}>{page.loading}</div> : null}

        {!isLoading && !errorMessage && !store ? (
          <div className={styles.statePanel}>{page.storeNotFound}</div>
        ) : null}

        {!isLoading && !errorMessage && store ? (
          <>
            <section className={styles.detailHero}>
              <span className={styles.detailHeroCode}>{store.storeCode}</span>
              <h2 className={styles.detailHeroName}>{store.name}</h2>
              <p className={styles.detailHeroAddress}>{store.address || "-"}</p>
              <div className={styles.detailHeroStats}>
                <div className={styles.detailHeroStat}>
                  <span className={styles.detailHeroStatLabel}>
                    {page.pendingHeading}
                  </span>
                  <strong className={styles.detailHeroStatValue}>
                    {pendingUsers.length}
                  </strong>
                </div>
                <div className={styles.detailHeroStat}>
                  <span className={styles.detailHeroStatLabel}>{page.team}</span>
                  <strong className={styles.detailHeroStatValue}>
                    {teamUsers.length}
                  </strong>
                </div>
              </div>
            </section>

            {!isOverview ? (
              <button
                type="button"
                className={styles.subviewBack}
                onClick={() => openDetailView("overview")}
              >
                ← {page.backToOverview}
              </button>
            ) : null}

            {isOverview ? (
              <div className={styles.detailActionList}>
                <ActionCard
                  count={pendingUsers.length}
                  hint={page.pendingCardHint}
                  label={page.pendingHeading}
                  onClick={() => openDetailView("pending")}
                />
                <ActionCard
                  count={teamUsers.length}
                  hint={page.teamCardHint}
                  label={page.team}
                  onClick={() => openDetailView("team")}
                />
                <ActionCard
                  count={activeStoreUsers.length}
                  hint={page.statsCardHint}
                  label={page.stats}
                  onClick={() => openDetailView("stats")}
                />
              </div>
            ) : null}

            {detailView === "pending" ? (
              <section className={styles.detailSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>{page.pendingHeading}</span>
                  <span className={styles.sectionCount}>{pendingUsers.length}</span>
                </div>
                {pendingUsers.length === 0 ? (
                  <div className={styles.statePanel}>{page.noPending}</div>
                ) : (
                  <div className={styles.userCardList}>
                    {pendingUsers.map((item) => (
                      <PendingUserCard
                        key={item.id}
                        appliedRoleLabel={formatJobRoleLabel(item.jobRole, lang)}
                        draft={reviewDrafts[String(item.id)] ?? { jobRole: "" }}
                        isReviewing={reviewingUserId === item.id}
                        labels={page}
                        roleOptions={roleOptions}
                        user={item}
                        onPatchDraft={(jobRole) => patchReviewDraft(item.id, jobRole)}
                        onReview={(status) => void reviewUser(item.id, status)}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {detailView === "team" ? (
              <section className={styles.detailSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>{page.team}</span>
                  <span className={styles.sectionCount}>
                    {filteredTeamUsers.length}
                  </span>
                </div>
                <input
                  type="search"
                  className={styles.teamSearch}
                  placeholder={page.searchPlaceholder}
                  value={teamSearchTerm}
                  onChange={(event) => setTeamSearchTerm(event.target.value)}
                />
                <div className={styles.filterScroller}>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${
                      !teamRoleFilter ? styles.filterPillActive : ""
                    }`}
                    onClick={() => setTeamRoleFilter("")}
                  >
                    {page.filterAll}
                  </button>
                  {roleOptions.map((roleOption) => {
                    const isActive = teamRoleFilter === roleOption.value;

                    return (
                      <button
                        key={roleOption.value}
                        type="button"
                        className={`${styles.filterPill} ${
                          isActive ? styles.filterPillActive : ""
                        }`}
                        onClick={() => setTeamRoleFilter(roleOption.value)}
                      >
                        {roleOption.label}
                      </button>
                    );
                  })}
                </div>
                {teamUsers.length === 0 ? (
                  <div className={styles.statePanel}>{page.noTeam}</div>
                ) : filteredTeamUsers.length === 0 ? (
                  <div className={styles.statePanel}>{page.noSearchResult}</div>
                ) : (
                  <div className={styles.userCardList}>
                    {filteredTeamUsers.map((item) => (
                      <TeamUserCard
                        key={item.id}
                        draft={
                          teamDrafts[String(item.id)] ??
                          normalizeJobRoleString(item.jobRole)
                        }
                        isRemoving={removingUserId === item.id}
                        isSaving={savingUserId === item.id}
                        labels={page}
                        lang={lang}
                        roleOptions={roleOptions}
                        user={item}
                        onPatchDraft={(userId, nextJobRole) => {
                          patchTeamDraft(userId, nextJobRole);
                          void saveJobRole(userId, nextJobRole);
                        }}
                        onRemove={removeUser}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {detailView === "stats" ? (
              <section className={styles.detailSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>{page.stats}</span>
                  <span className={styles.sectionCount}>
                    {activeStoreUsers.length}
                  </span>
                </div>
                <div className={styles.statsList}>
                  <div className={styles.statsRow}>
                    <span className={styles.statsRowLabel}>{page.totalMembers}</span>
                    <span className={styles.statsRowValue}>
                      {activeStoreUsers.length}
                    </span>
                  </div>
                  <div className={styles.statsRow}>
                    <span className={styles.statsRowLabel}>{page.pendingHeading}</span>
                    <span className={styles.statsRowValue}>{pendingUsers.length}</span>
                  </div>
                  <div className={styles.statsRow}>
                    <span className={styles.statsRowLabel}>{page.team}</span>
                    <span className={styles.statsRowValue}>{teamUsers.length}</span>
                  </div>
                  {roleStats.map((roleStat) => (
                    <div className={styles.statsRow} key={roleStat.value}>
                      <span className={styles.statsRowLabel}>{roleStat.label}</span>
                      <span className={styles.statsRowValue}>{roleStat.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
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
