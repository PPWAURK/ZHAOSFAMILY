"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  fetchPermissionRoles,
  fetchPermissionUsers,
  updatePermissionUserRoles,
} from "@/features/permissions/services/permissionsApi";

const MANAGE_PERMISSION = "system.permission.manage";

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
      topStage: "权限中心 · PERMISSIONS",
      kicker: "System · Roles · Access",
      title: "全系统",
      titleEm: "权限中心",
      titleSuffix: "",
      lede: "管理成员的内置角色。第一版只支持给用户分配多个系统角色。",
      stepLabel: "RBAC",
      stepDetail: "角色分配会立即影响后端权限校验。",
      metrics: [
        { value: "04", label: "BUILT-IN ROLES" },
        { value: "01", label: "SYSTEM PERMISSION" },
        { value: "RBAC", label: "ACCESS MODEL" },
      ],
      noPermission: "无权限",
      deniedTitle: "无权限访问",
      deniedDetail: "需要“管理系统权限”权限才能访问权限中心。",
      loadingAuth: "正在确认权限...",
      loadingData: "正在加载权限数据...",
      emptyUsers: "暂无用户。",
      loadError: "权限数据加载失败",
      saveError: "角色保存失败",
      table: {
        name: "姓名",
        email: "邮箱",
        store: "门店",
        jobRole: "岗位",
        roles: "角色",
        permissions: "权限摘要",
        action: "操作",
      },
      actions: {
        save: "保存",
        saving: "保存中",
      },
    },
  },
  en: {
    shared: TRAINING_COPY.en.shared,
    page: {
      topStage: "Permissions",
      kicker: "System · Roles · Access",
      title: "System",
      titleEm: "Permissions",
      titleSuffix: "",
      lede: "Manage built-in roles for each user. This first version supports multiple roles per user.",
      stepLabel: "RBAC",
      stepDetail: "Role assignments affect backend permission checks immediately.",
      metrics: [
        { value: "04", label: "BUILT-IN ROLES" },
        { value: "01", label: "SYSTEM PERMISSION" },
        { value: "RBAC", label: "ACCESS MODEL" },
      ],
      noPermission: "No permissions",
      deniedTitle: "Access denied",
      deniedDetail: "The Manage system permissions permission is required.",
      loadingAuth: "Checking permissions...",
      loadingData: "Loading permissions...",
      emptyUsers: "No users yet.",
      loadError: "Failed to load permission data",
      saveError: "Failed to save roles",
      table: {
        name: "Name",
        email: "Email",
        store: "Store",
        jobRole: "Job role",
        roles: "Roles",
        permissions: "Permission summary",
        action: "Action",
      },
      actions: {
        save: "Save",
        saving: "Saving",
      },
    },
  },
  fr: {
    shared: TRAINING_COPY.fr.shared,
    page: {
      topStage: "Permissions",
      kicker: "System · Roles · Access",
      title: "Centre",
      titleEm: "Permissions",
      titleSuffix: "",
      lede: "Gérez les rôles intégrés de chaque utilisateur. Cette première version accepte plusieurs rôles par utilisateur.",
      stepLabel: "RBAC",
      stepDetail: "Les rôles modifient immédiatement les contrôles côté API.",
      metrics: [
        { value: "04", label: "BUILT-IN ROLES" },
        { value: "01", label: "SYSTEM PERMISSION" },
        { value: "RBAC", label: "ACCESS MODEL" },
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
      table: {
        name: "Nom",
        email: "Email",
        store: "Boutique",
        jobRole: "Poste",
        roles: "Rôles",
        permissions: "Résumé des permissions",
        action: "Action",
      },
      actions: {
        save: "Enregistrer",
        saving: "Enregistrement",
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

function getSelectedRoleNames(selectElement) {
  return Array.from(selectElement.selectedOptions).map((option) => option.value);
}

export default function PermissionsPage() {
  const { user, isLoading } = useAuth();
  const canManagePermissions = hasPermission(user, MANAGE_PERMISSION);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [draftRolesByUserId, setDraftRolesByUserId] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingUserId, setSavingUserId] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadPermissionsData() {
      if (!canManagePermissions) {
        return;
      }

      setIsLoadingData(true);
      setErrorMessage("");

      try {
        const [nextRoles, nextUsers] = await Promise.all([
          fetchPermissionRoles(),
          fetchPermissionUsers(),
        ]);

        if (isActive) {
          setRoles(nextRoles);
          setUsers(nextUsers);
          setDraftRolesByUserId(
            Object.fromEntries(
              nextUsers.map((item) => [item.id, item.roles || []]),
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

  function updateDraftRoles(userId, roleNames) {
    setDraftRolesByUserId((prev) => ({
      ...prev,
      [userId]: roleNames,
    }));
  }

  async function saveUserRoles(userId) {
    const roleNames = draftRolesByUserId[userId] || [];

    setSavingUserId(userId);
    setErrorMessage("");

    try {
      const updatedUser = await updatePermissionUserRoles(userId, roleNames);
      setUsers((prev) =>
        prev.map((item) => (item.id === userId ? updatedUser : item)),
      );
      setDraftRolesByUserId((prev) => ({
        ...prev,
        [userId]: updatedUser.roles || [],
      }));
    } catch (error) {
      setErrorMessage(error.message || "角色保存失败");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <TrainingLayout pageCopy={PERMISSIONS_COPY}>
      {({ lang, t, styles }) => {
        const roleOptions = roles.map((role) => ({
          value: role.name,
          label: formatRoleLabel(role.name, lang),
          title: formatPermissionSummary(
            role.permissions,
            lang,
            t.page.noPermission,
          ),
        }));

        return (
          <>
            <section className={styles.pageHeaderCard}>
              <div>
                <p className={styles.pageStep}>
                  <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                  <span>{t.page.stepDetail}</span>
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
                  <table className={styles.permissionTable}>
                    <thead>
                      <tr>
                        <th>{t.page.table.name}</th>
                        <th>{t.page.table.email}</th>
                        <th>{t.page.table.store}</th>
                        <th>{t.page.table.jobRole}</th>
                        <th>{t.page.table.roles}</th>
                        <th>{t.page.table.permissions}</th>
                        <th>{t.page.table.action}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((item) => {
                        const draftRoles = draftRolesByUserId[item.id] || [];

                        return (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.email}</td>
                            <td>{item.restaurant?.name || "-"}</td>
                            <td>{item.jobRole || "-"}</td>
                            <td>
                              <select
                                multiple
                                value={draftRoles}
                                disabled={savingUserId === item.id}
                                onChange={(event) =>
                                  updateDraftRoles(
                                    item.id,
                                    getSelectedRoleNames(event.currentTarget),
                                  )
                                }
                              >
                                {roleOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                    title={option.title}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td title={(item.permissions || []).join(" / ")}>
                              {formatPermissionSummary(
                                item.permissions || [],
                                lang,
                                t.page.noPermission,
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.permissionSaveButton}
                                disabled={savingUserId === item.id}
                                onClick={() => saveUserRoles(item.id)}
                              >
                                {savingUserId === item.id
                                  ? t.page.actions.saving
                                  : t.page.actions.save}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
