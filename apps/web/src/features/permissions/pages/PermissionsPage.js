"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  fetchManageableRestaurants,
  fetchPermissionRoles,
  fetchPermissionUsers,
  updatePermissionUserManagedRestaurants,
  updatePermissionUserRoles,
} from "@/features/permissions/services/permissionsApi";
import { formatJobRoleLabel } from "@/shared/constants/job-roles";

const MANAGE_PERMISSION = "system.permission.manage";
const SUPER_ADMIN_ROLE = "super-admin";
const HOLDING_JOB_ROLE = "holding";
const REGIONAL_MANAGER_JOB_ROLE = "regional-manager";

const ROLE_LABELS = {
  "super-admin": {
    zh: "最高管理员",
    en: "Super admin",
    fr: "Super administrateur",
  },
  "store-manager": {
    zh: "门店经理",
    en: "Store manager",
    fr: "Responsable boutique",
  },
  "training-admin": {
    zh: "培训管理员",
    en: "Training admin",
    fr: "Administrateur formation",
  },
  "training-viewer": {
    zh: "培训查看者",
    en: "Training viewer",
    fr: "Lecteur formation",
  },
};

const PERMISSION_LABELS = {
  "system.permission.manage": {
    zh: "管理系统权限",
    en: "Manage system permissions",
    fr: "Gérer les permissions système",
  },
  "employee.job_role.manage_store": {
    zh: "管理本店员工岗位",
    en: "Manage store employee roles",
    fr: "Gérer les postes de la boutique",
  },
  "training.material.read": {
    zh: "查看培训资料",
    en: "View training materials",
    fr: "Voir les supports de formation",
  },
  "training.material.play": {
    zh: "播放培训资料",
    en: "Play training materials",
    fr: "Lire les supports de formation",
  },
  "training.material.create": {
    zh: "创建培训资料",
    en: "Create training materials",
    fr: "Créer des supports de formation",
  },
  "training.material.update": {
    zh: "编辑培训资料",
    en: "Edit training materials",
    fr: "Modifier les supports de formation",
  },
  "training.material.delete": {
    zh: "删除培训资料",
    en: "Delete training materials",
    fr: "Supprimer les supports de formation",
  },
  "training.position.manage": {
    zh: "管理培训岗位",
    en: "Manage training positions",
    fr: "Gérer les postes formation",
  },
};

const PERMISSIONS_COPY = {
  zh: {
    shared: TRAINING_COPY.zh.shared,
    page: {
      topStage: "系统角色 · ADVANCED ACCESS",
      kicker: "System · Advanced roles",
      title: "系统",
      titleEm: "角色中心",
      titleSuffix: "",
      lede: "只管理少数高级系统角色。日常前厅、后厨和门店岗位请在团队管理或岗位管理里处理。",
      stepLabel: "RBAC",
      stepDetail: "系统角色会立即影响后端权限校验。",
      boundaryNote:
        "岗位决定员工做什么和学习什么；系统角色决定员工能操作哪些后台能力。",
      metrics: [
        { value: "04", label: "BUILT-IN ROLES" },
        { value: "RBAC", label: "SYSTEM ACCESS" },
        { value: "HQ", label: "HOLDING ONLY" },
      ],
      noPermission: "无权限",
      deniedTitle: "无权限访问",
      deniedDetail: "需要“管理系统权限”权限才能访问权限中心。",
      loadingAuth: "正在确认权限...",
      loadingData: "正在加载权限数据...",
      emptyUsers: "暂无用户。",
      loadError: "权限数据加载失败",
      saveError: "角色保存失败",
      roleLocked: "仅 holding 岗位可分配最高管理员",
      noChanges: "未修改",
      unassignedStore: "未分配门店",
      memberCountSuffix: "人",
      managedStoresUnavailable: "非区域经理不需要设置门店范围",
      storeJumpLabel: "快速跳转门店",
      table: {
        name: "姓名",
        email: "邮箱",
        status: "状态",
        jobRole: "运营岗位（只读）",
        managedStores: "区域经理门店范围",
        roles: "系统角色",
        permissions: "系统权限摘要",
        action: "操作",
      },
      actions: {
        save: "保存",
        saveStores: "保存范围",
        saving: "保存中",
      },
      status: {
        pending: "待审批",
        approved: "已通过",
        rejected: "已拒绝",
      },
    },
  },
  en: {
    shared: TRAINING_COPY.en.shared,
    page: {
      topStage: "System roles",
      kicker: "System · Advanced roles",
      title: "System",
      titleEm: "Roles",
      titleSuffix: "",
      lede: "Manage only advanced system roles. Daily front-of-house, kitchen, and store positions are handled in team or position management.",
      stepLabel: "RBAC",
      stepDetail: "System roles affect backend permission checks immediately.",
      boundaryNote:
        "Positions define what employees do and learn; system roles define which admin capabilities they can use.",
      metrics: [
        { value: "04", label: "BUILT-IN ROLES" },
        { value: "RBAC", label: "SYSTEM ACCESS" },
        { value: "HQ", label: "HOLDING ONLY" },
      ],
      noPermission: "No permissions",
      deniedTitle: "Access denied",
      deniedDetail: "The Manage system permissions permission is required.",
      loadingAuth: "Checking permissions...",
      loadingData: "Loading permissions...",
      emptyUsers: "No users yet.",
      loadError: "Failed to load permission data",
      saveError: "Failed to save roles",
      roleLocked: "Only holding users can receive super admin",
      noChanges: "No changes",
      unassignedStore: "Unassigned store",
      memberCountSuffix: "members",
      managedStoresUnavailable: "Store scope is only set for regional managers",
      storeJumpLabel: "Jump to store",
      table: {
        name: "Name",
        email: "Email",
        status: "Status",
        jobRole: "Operations position (read-only)",
        managedStores: "Regional store scope",
        roles: "System roles",
        permissions: "System permission summary",
        action: "Action",
      },
      actions: {
        save: "Save",
        saveStores: "Save scope",
        saving: "Saving",
      },
      status: {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
      },
    },
  },
  fr: {
    shared: TRAINING_COPY.fr.shared,
    page: {
      topStage: "Rôles système",
      kicker: "System · Rôles avancés",
      title: "Centre",
      titleEm: "Rôles",
      titleSuffix: "",
      lede: "Gérez uniquement les rôles système avancés. Les postes salle, cuisine et boutique se gèrent dans l'équipe ou les postes.",
      stepLabel: "RBAC",
      stepDetail: "Les rôles système modifient immédiatement les contrôles côté API.",
      boundaryNote:
        "Les postes définissent le travail et la formation ; les rôles système définissent les capacités d'administration.",
      metrics: [
        { value: "04", label: "BUILT-IN ROLES" },
        { value: "RBAC", label: "SYSTEM ACCESS" },
        { value: "HQ", label: "HOLDING ONLY" },
      ],
      noPermission: "Aucune permission",
      deniedTitle: "Accès refusé",
      deniedDetail:
        "La permission Gérer les permissions système est nécessaire.",
      loadingAuth: "Vérification des permissions...",
      loadingData: "Chargement des permissions...",
      emptyUsers: "Aucun utilisateur.",
      loadError: "Échec du chargement des permissions",
      saveError: "Échec de l'enregistrement des rôles",
      roleLocked:
        "Seuls les utilisateurs holding peuvent recevoir super admin",
      noChanges: "Aucun changement",
      unassignedStore: "Boutique non assignée",
      memberCountSuffix: "membres",
      managedStoresUnavailable:
        "Le périmètre boutique concerne uniquement les managers régionaux",
      storeJumpLabel: "Aller à la boutique",
      table: {
        name: "Nom",
        email: "Email",
        status: "Statut",
        jobRole: "Poste opérationnel (lecture)",
        managedStores: "Périmètre régional",
        roles: "Rôles système",
        permissions: "Résumé permissions système",
        action: "Action",
      },
      actions: {
        save: "Enregistrer",
        saveStores: "Enregistrer périmètre",
        saving: "Enregistrement",
      },
      status: {
        pending: "En attente",
        approved: "Approuvé",
        rejected: "Refusé",
      },
    },
  },
};

function hasPermission(user, permission) {
  return user?.permissions?.includes(permission);
}

function getLocalizedLabel(labels, key, lang) {
  return labels[key]?.[lang] || key;
}

function formatRoleLabel(roleName, lang) {
  return `${getLocalizedLabel(ROLE_LABELS, roleName, lang)} · ${roleName}`;
}

function formatPermissionSummary(permissions, lang, fallback) {
  if (!permissions?.length) {
    return fallback;
  }

  return permissions
    .map((permission) => getLocalizedLabel(PERMISSION_LABELS, permission, lang))
    .join(" / ");
}

function formatPermissionLabels(permissions, lang, fallback) {
  if (!permissions?.length) {
    return [fallback];
  }

  return permissions.map((permission) =>
    getLocalizedLabel(PERMISSION_LABELS, permission, lang),
  );
}

function normalizeRoleNames(roleNames) {
  return [...(roleNames || [])].sort();
}

function areRoleNamesEqual(leftRoles, rightRoles) {
  const left = normalizeRoleNames(leftRoles);
  const right = normalizeRoleNames(rightRoles);

  return (
    left.length === right.length &&
    left.every((roleName, index) => roleName === right[index])
  );
}

function canAssignRoleToUser(roleName, user) {
  return (
    roleName !== SUPER_ADMIN_ROLE ||
    getJobRoleValues(user?.jobRole).includes(HOLDING_JOB_ROLE)
  );
}

function getUserIdKey(userId) {
  return String(userId);
}

function getJobRoleValues(jobRole) {
  return `${jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function isRegionalManager(user) {
  return getJobRoleValues(user?.jobRole).includes(REGIONAL_MANAGER_JOB_ROLE);
}

function getUserStoreKey(user) {
  return user?.restaurant?.id ? `store-${user.restaurant.id}` : "unassigned";
}

function getPermissionStoreAnchorId(storeKey) {
  return `permission-${String(storeKey).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function normalizeRestaurantIds(restaurantIds) {
  return [...(restaurantIds || [])].map(Number).sort((left, right) => left - right);
}

function areRestaurantIdsEqual(leftIds, rightIds) {
  const left = normalizeRestaurantIds(leftIds);
  const right = normalizeRestaurantIds(rightIds);

  return (
    left.length === right.length &&
    left.every((restaurantId, index) => restaurantId === right[index])
  );
}

function groupUsersByStore(users, unassignedStoreName) {
  const groupsByStore = new Map();

  for (const item of users) {
    const storeKey = getUserStoreKey(item);
    const storeName = item.restaurant?.name || unassignedStoreName;
    const currentGroup = groupsByStore.get(storeKey);

    if (currentGroup) {
      currentGroup.users.push(item);
      continue;
    }

    groupsByStore.set(storeKey, {
      key: storeKey,
      storeName,
      users: [item],
    });
  }

  return Array.from(groupsByStore.values());
}

export default function PermissionsPage() {
  const { user, isLoading } = useAuth();
  const canManagePermissions = hasPermission(user, MANAGE_PERMISSION);
  const [roles, setRoles] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [draftRolesByUserId, setDraftRolesByUserId] = useState({});
  const [draftManagedRestaurantsByUserId, setDraftManagedRestaurantsByUserId] =
    useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingUserId, setSavingUserId] = useState(null);
  const [savingManagedRestaurantsUserId, setSavingManagedRestaurantsUserId] =
    useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadPermissionsData() {
      if (!canManagePermissions) {
        setRoles([]);
        setRestaurants([]);
        setUsers([]);
        setDraftRolesByUserId({});
        setDraftManagedRestaurantsByUserId({});
        return;
      }

      setIsLoadingData(true);
      setErrorMessage("");

      try {
        const [nextRoles, nextUsers, nextRestaurants] = await Promise.all([
          fetchPermissionRoles(),
          fetchPermissionUsers(),
          fetchManageableRestaurants(),
        ]);

        if (isActive) {
          setRoles(nextRoles);
          setRestaurants(nextRestaurants);
          setUsers(nextUsers);
          setDraftRolesByUserId(
            Object.fromEntries(
              nextUsers.map((item) => [
                getUserIdKey(item.id),
                normalizeRoleNames(item.roles),
              ]),
            ),
          );
          setDraftManagedRestaurantsByUserId(
            Object.fromEntries(
              nextUsers.map((item) => [
                getUserIdKey(item.id),
                normalizeRestaurantIds(
                  (item.managedRestaurants || []).map(
                    (restaurant) => restaurant.id,
                  ),
                ),
              ]),
            ),
          );
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message || "权限数据加载失败");
        }
      } finally {
        if (isActive) {
          setIsLoadingData(false);
        }
      }
    }

    loadPermissionsData();

    return () => {
      isActive = false;
    };
  }, [canManagePermissions]);

  function updateDraftRole(userId, roleName, checked) {
    const userIdKey = getUserIdKey(userId);

    setDraftRolesByUserId((prev) => ({
      ...prev,
      [userIdKey]: normalizeRoleNames(
        checked
          ? [...(prev[userIdKey] || []), roleName]
          : (prev[userIdKey] || []).filter((item) => item !== roleName),
      ),
    }));
  }

  function updateDraftManagedRestaurant(userId, restaurantId, checked) {
    const userIdKey = getUserIdKey(userId);

    setDraftManagedRestaurantsByUserId((prev) => ({
      ...prev,
      [userIdKey]: normalizeRestaurantIds(
        checked
          ? [...(prev[userIdKey] || []), restaurantId]
          : (prev[userIdKey] || []).filter((item) => item !== restaurantId),
      ),
    }));
  }

  async function saveUserRoles(userId) {
    const userIdKey = getUserIdKey(userId);
    const roleNames = draftRolesByUserId[userIdKey] || [];

    setSavingUserId(userId);
    setErrorMessage("");

    try {
      const updatedUser = await updatePermissionUserRoles(userIdKey, roleNames);
      setUsers((prev) =>
        prev.map((item) => (item.id === userId ? updatedUser : item)),
      );
      setDraftRolesByUserId((prev) => ({
        ...prev,
        [getUserIdKey(updatedUser.id)]: normalizeRoleNames(updatedUser.roles),
      }));
    } catch (error) {
      setErrorMessage(error.message || "角色保存失败");
    } finally {
      setSavingUserId(null);
    }
  }

  async function saveManagedRestaurants(userId) {
    const userIdKey = getUserIdKey(userId);
    const restaurantIds = draftManagedRestaurantsByUserId[userIdKey] || [];

    setSavingManagedRestaurantsUserId(userId);
    setErrorMessage("");

    try {
      const updatedUser = await updatePermissionUserManagedRestaurants(
        userIdKey,
        restaurantIds,
      );
      setUsers((prev) =>
        prev.map((item) => (item.id === userId ? updatedUser : item)),
      );
      setDraftManagedRestaurantsByUserId((prev) => ({
        ...prev,
        [getUserIdKey(updatedUser.id)]: normalizeRestaurantIds(
          (updatedUser.managedRestaurants || []).map(
            (restaurant) => restaurant.id,
          ),
        ),
      }));
    } catch (error) {
      setErrorMessage(error.message || "角色保存失败");
    } finally {
      setSavingManagedRestaurantsUserId(null);
    }
  }

  return (
    <TrainingLayout pageCopy={PERMISSIONS_COPY}>
      {({ lang, t, styles }) => {
        const permissionStoreGroups = groupUsersByStore(
          users,
          t.page.unassignedStore,
        );

        return (
          <>
            <section className={styles.pageHeaderCard}>
              <div>
                <p className={styles.pageStep}>
                  <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                  <span>{t.page.stepDetail}</span>
                </p>
                <p className={styles.permissionBoundaryNote}>
                  {t.page.boundaryNote}
                </p>
                {errorMessage ? (
                  <p className={styles.materialLoadError}>{errorMessage}</p>
                ) : null}
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

            {isLoading ? (
              <section className={styles.materialEmpty}>
                {t.page.loadingAuth}
              </section>
            ) : !canManagePermissions ? (
              <section className={styles.permissionDenied}>
                <h2>{t.page.deniedTitle}</h2>
                <p>{t.page.deniedDetail}</p>
              </section>
            ) : (
              <section className={styles.permissionTableWrap}>
                {isLoadingData ? (
                  <div className={styles.materialEmpty}>
                    {t.page.loadingData}
                  </div>
                ) : users.length > 0 ? (
                  <>
                    <nav
                      className={styles.permissionStoreJumpNav}
                      aria-label={t.page.storeJumpLabel}
                    >
                      <span className={styles.permissionStoreJumpLabel}>
                        {t.page.storeJumpLabel}
                      </span>
                      <div className={styles.permissionStoreJumpButtons}>
                        {permissionStoreGroups.map((group) => (
                          <a
                            key={group.key}
                            className={styles.permissionStoreJumpButton}
                            href={`#${getPermissionStoreAnchorId(group.key)}`}
                          >
                            <span>{group.storeName}</span>
                            <strong>{group.users.length}</strong>
                          </a>
                        ))}
                      </div>
                    </nav>

                    <div className={styles.permissionStoreGroups}>
                      {permissionStoreGroups.map((group) => (
                        <details
                          key={group.key}
                          id={getPermissionStoreAnchorId(group.key)}
                          className={styles.permissionStoreGroup}
                          open
                        >
                          <summary className={styles.permissionStoreSummary}>
                            <span>{group.storeName}</span>
                            <span>
                              {group.users.length} {t.page.memberCountSuffix}
                            </span>
                          </summary>

                          <div className={styles.permissionUserGrid}>
                            {group.users.map((item) => {
                              const userIdKey = getUserIdKey(item.id);
                              const currentRoles = normalizeRoleNames(
                                item.roles,
                              );
                              const draftRoles =
                                draftRolesByUserId[userIdKey] || currentRoles;
                              const currentManagedRestaurantIds =
                                normalizeRestaurantIds(
                                  (item.managedRestaurants || []).map(
                                    (restaurant) => restaurant.id,
                                  ),
                                );
                              const draftManagedRestaurantIds =
                                draftManagedRestaurantsByUserId[userIdKey] ||
                                currentManagedRestaurantIds;
                              const hasRoleChanges = !areRoleNamesEqual(
                                currentRoles,
                                draftRoles,
                              );
                              const hasManagedRestaurantChanges =
                                !areRestaurantIdsEqual(
                                  currentManagedRestaurantIds,
                                  draftManagedRestaurantIds,
                                );
                              const canEditManagedRestaurants =
                                isRegionalManager(item);
                              const permissionLabels = formatPermissionLabels(
                                item.permissions || [],
                                lang,
                                t.page.noPermission,
                              );

                              return (
                                <article
                                  key={item.id}
                                  className={styles.permissionUserCard}
                                >
                                  <header className={styles.permissionUserHead}>
                                    <div
                                      className={styles.permissionUserIdentity}
                                    >
                                      <strong>{item.name || "-"}</strong>
                                      <span>{item.email || "-"}</span>
                                    </div>
                                    <span className={styles.permissionStatusPill}>
                                      {t.page.status[item.accountStatus] ||
                                        item.accountStatus ||
                                        "-"}
                                    </span>
                                  </header>

                                  <div className={styles.permissionUserMeta}>
                                    <span className={styles.permissionMetaLabel}>
                                      {t.page.table.jobRole}
                                    </span>
                                    <span
                                      className={styles.permissionReadOnlyPill}
                                    >
                                      {formatJobRoleLabel(item.jobRole, lang)}
                                    </span>
                                  </div>

                                  <section
                                    className={styles.permissionCardSection}
                                  >
                                    <div
                                      className={styles.permissionSectionHead}
                                    >
                                      <span>{t.page.table.roles}</span>
                                    </div>
                                    <div className={styles.permissionRoleChips}>
                                      {roles.map((role) => {
                                        const isChecked = draftRoles.includes(
                                          role.name,
                                        );
                                        const canAssign = canAssignRoleToUser(
                                          role.name,
                                          item,
                                        );
                                        const isDisabled =
                                          savingUserId === item.id ||
                                          (!canAssign && !isChecked);
                                        const permissionTitle =
                                          formatPermissionSummary(
                                            role.permissions || [],
                                            lang,
                                            t.page.noPermission,
                                          );

                                        return (
                                          <label
                                            key={role.name}
                                            className={
                                              isDisabled
                                                ? styles.permissionRoleChipDisabled
                                                : styles.permissionRoleChip
                                            }
                                            title={
                                              canAssign
                                                ? permissionTitle
                                                : t.page.roleLocked
                                            }
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              disabled={isDisabled}
                                              onChange={(event) =>
                                                updateDraftRole(
                                                  item.id,
                                                  role.name,
                                                  event.currentTarget.checked,
                                                )
                                              }
                                            />
                                            <span>
                                              {formatRoleLabel(role.name, lang)}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </section>

                                  <section
                                    className={styles.permissionCardSection}
                                  >
                                    <div
                                      className={styles.permissionSectionHead}
                                    >
                                      <span>{t.page.table.managedStores}</span>
                                    </div>
                                    {canEditManagedRestaurants ? (
                                      <div
                                        className={styles.permissionScopePanel}
                                      >
                                        <div
                                          className={
                                            styles.permissionManagedStoreGrid
                                          }
                                        >
                                          {restaurants.map((restaurant) => {
                                            const restaurantId = Number(
                                              restaurant.id,
                                            );
                                            const isChecked =
                                              draftManagedRestaurantIds.includes(
                                                restaurantId,
                                              );

                                            return (
                                              <label
                                                key={restaurant.id}
                                                className={
                                                  styles.permissionManagedStoreOption
                                                }
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  disabled={
                                                    savingManagedRestaurantsUserId ===
                                                    item.id
                                                  }
                                                  onChange={(event) =>
                                                    updateDraftManagedRestaurant(
                                                      item.id,
                                                      restaurantId,
                                                      event.currentTarget
                                                        .checked,
                                                    )
                                                  }
                                                />
                                                <span>{restaurant.name}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                        <button
                                          type="button"
                                          className={styles.permissionSaveButton}
                                          disabled={
                                            savingManagedRestaurantsUserId ===
                                              item.id ||
                                            !hasManagedRestaurantChanges
                                          }
                                          onClick={() =>
                                            saveManagedRestaurants(item.id)
                                          }
                                        >
                                          {savingManagedRestaurantsUserId ===
                                          item.id
                                            ? t.page.actions.saving
                                            : hasManagedRestaurantChanges
                                              ? t.page.actions.saveStores
                                              : t.page.noChanges}
                                        </button>
                                      </div>
                                    ) : (
                                      <p className={styles.permissionMutedText}>
                                        {t.page.managedStoresUnavailable}
                                      </p>
                                    )}
                                  </section>

                                  <section
                                    className={styles.permissionCardSection}
                                  >
                                    <div
                                      className={styles.permissionSectionHead}
                                    >
                                      <span>{t.page.table.permissions}</span>
                                    </div>
                                    <div
                                      className={styles.permissionSummaryChips}
                                      title={(item.permissions || []).join(
                                        " / ",
                                      )}
                                    >
                                      {permissionLabels.map((permissionLabel, index) => (
                                        <span key={`${permissionLabel}-${index}`}>
                                          {permissionLabel}
                                        </span>
                                      ))}
                                    </div>
                                  </section>

                                  <footer
                                    className={styles.permissionCardFooter}
                                  >
                                    <button
                                      type="button"
                                      className={styles.permissionSaveButton}
                                      disabled={
                                        savingUserId === item.id ||
                                        !hasRoleChanges
                                      }
                                      onClick={() => saveUserRoles(item.id)}
                                    >
                                      {savingUserId === item.id
                                        ? t.page.actions.saving
                                        : hasRoleChanges
                                          ? t.page.actions.save
                                          : t.page.noChanges}
                                    </button>
                                  </footer>
                                </article>
                              );
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.materialEmpty}>{t.page.emptyUsers}</div>
                )}
              </section>
            )}
          </>
        );
      }}
    </TrainingLayout>
  );
}
