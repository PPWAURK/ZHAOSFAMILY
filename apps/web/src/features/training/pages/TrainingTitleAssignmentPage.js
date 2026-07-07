"use client";

import { useEffect, useMemo, useState } from "react";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  assignTrainingTitle,
  createTrainingTitle,
  fetchTrainingTitleRecipients,
  fetchTrainingTitles,
  revokeTrainingTitle,
} from "@/features/training/services/trainingMediaApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/shared/components/toast/ToastProvider";

const MANAGE_TITLE_PERMISSION = "training.title.manage";
const MANAGE_SYSTEM_PERMISSION = "system.permission.manage";
const MANAGE_BADGE_PERMISSION = "training.badge.manage";
const TITLE_FRAME_OPTIONS = [
  {
    value: "red",
    label: { zh: "红印框", en: "Red seal", fr: "Sceau rouge" },
    className: "titleFrameRed",
  },
  {
    value: "gold",
    label: { zh: "金边框", en: "Gold frame", fr: "Cadre or" },
    className: "titleFrameGold",
  },
  {
    value: "ink",
    label: { zh: "墨黑框", en: "Ink frame", fr: "Cadre encre" },
    className: "titleFrameInk",
  },
  {
    value: "jade",
    label: { zh: "青玉框", en: "Jade frame", fr: "Cadre jade" },
    className: "titleFrameJade",
  },
  {
    value: "blue",
    label: { zh: "蓝章框", en: "Blue badge", fr: "Badge bleu" },
    className: "titleFrameBlue",
  },
  {
    value: "purple",
    label: { zh: "紫绶框", en: "Purple sash", fr: "Ruban violet" },
    className: "titleFramePurple",
  },
];

const PAGE_COPY = {
  zh: {
    shared: TRAINING_COPY.zh.shared,
    page: {
      topStage: "称号分发",
      kicker: "Training Titles",
      title: "员工称号",
      titleEm: "分发",
      titleSuffix: "",
      lede: "称号由管理员分发和收回；培训测验与必修完成只用于徽章认证，不自动发称号。",
      stepLabel: "Admin",
      stepDetail: "选择一个称号，再给对应员工发放或收回。",
      boundaryNote: "只有拥有 training.title.manage 权限的管理员可以操作称号。",
      loadingAuth: "正在检查权限...",
      loadingData: "正在加载称号和员工...",
      deniedTitle: "没有称号管理权限",
      deniedDetail: "请让系统管理员分配 training.title.manage 权限。",
      loadError: "称号分发数据加载失败",
      emptyTitles: "暂无可分发称号",
      emptyUsers: "暂无员工",
      createHeading: "新增称号",
      createNameZh: "中文名",
      createNameEn: "英文名",
      createNameFr: "法文名",
      createFrameStyle: "展示样式",
      createSubmit: "添加称号",
      createSuccess: "称号已添加",
      createError: "称号添加失败",
      framePreview: "样式预览",
      selectedTitle: "待分发称号",
      searchLabel: "搜索员工",
      searchPlaceholder: "姓名、邮箱、门店或岗位",
      storeJumpLabel: "门店",
      memberCountSuffix: "人",
      unassignedTitle: "未分发称号",
      assignedTitle: "已拥有",
      assign: "发放",
      revoke: "收回",
      assignedTitles: "当前称号",
      noAssignedTitles: "暂无称号",
      assignSuccess: "称号已发放",
      revokeSuccess: "称号已收回",
      saveError: "称号操作失败",
      metrics: [
        { label: "称号", value: "Admin" },
        { label: "方式", value: "手动" },
        { label: "徽章", value: "Quiz" },
      ],
    },
  },
  en: {
    shared: TRAINING_COPY.en.shared,
    page: {
      topStage: "Title assignment",
      kicker: "Training Titles",
      title: "Employee title",
      titleEm: "assignment",
      titleSuffix: "",
      lede: "Titles are assigned and revoked by admins. Quizzes and required training feed badge certification, not automatic title grants.",
      stepLabel: "Admin",
      stepDetail: "Pick a title, then assign or revoke it for employees.",
      boundaryNote: "Only admins with training.title.manage can change titles.",
      loadingAuth: "Checking permissions...",
      loadingData: "Loading titles and employees...",
      deniedTitle: "No title management permission",
      deniedDetail: "Ask a system admin to grant training.title.manage.",
      loadError: "Failed to load title assignment data",
      emptyTitles: "No distributable titles yet",
      emptyUsers: "No employees yet",
      createHeading: "Add title",
      createNameZh: "Chinese name",
      createNameEn: "English name",
      createNameFr: "French name",
      createFrameStyle: "Frame style",
      createSubmit: "Add title",
      createSuccess: "Title added",
      createError: "Failed to add title",
      framePreview: "Frame preview",
      selectedTitle: "Selected title",
      searchLabel: "Search employees",
      searchPlaceholder: "Name, email, store, or job role",
      storeJumpLabel: "Stores",
      memberCountSuffix: "people",
      unassignedTitle: "Not assigned",
      assignedTitle: "Assigned",
      assign: "Assign",
      revoke: "Revoke",
      assignedTitles: "Current titles",
      noAssignedTitles: "No titles yet",
      assignSuccess: "Title assigned",
      revokeSuccess: "Title revoked",
      saveError: "Title update failed",
      metrics: [
        { label: "Titles", value: "Admin" },
        { label: "Mode", value: "Admin" },
        { label: "Badges", value: "Quiz" },
      ],
    },
  },
  fr: {
    shared: TRAINING_COPY.fr.shared,
    page: {
      topStage: "Attribution titres",
      kicker: "Training Titles",
      title: "Attribution des",
      titleEm: "titres",
      titleSuffix: "",
      lede: "Les titres sont attribués et retirés par un administrateur. Les quiz et formations obligatoires servent aux badges.",
      stepLabel: "Admin",
      stepDetail: "Choisir un titre, puis l'attribuer ou le retirer.",
      boundaryNote: "Seuls les admins avec training.title.manage peuvent modifier les titres.",
      loadingAuth: "Vérification des permissions...",
      loadingData: "Chargement des titres et employés...",
      deniedTitle: "Permission titres manquante",
      deniedDetail: "Demandez à un administrateur d'ajouter training.title.manage.",
      loadError: "Échec du chargement des attributions",
      emptyTitles: "Aucun titre distribuable",
      emptyUsers: "Aucun employé",
      createHeading: "Ajouter un titre",
      createNameZh: "Nom chinois",
      createNameEn: "Nom anglais",
      createNameFr: "Nom français",
      createFrameStyle: "Style",
      createSubmit: "Ajouter",
      createSuccess: "Titre ajouté",
      createError: "Échec de l'ajout",
      framePreview: "Aperçu",
      selectedTitle: "Titre sélectionné",
      searchLabel: "Rechercher",
      searchPlaceholder: "Nom, email, boutique ou poste",
      storeJumpLabel: "Boutiques",
      memberCountSuffix: "personnes",
      unassignedTitle: "Non attribué",
      assignedTitle: "Attribué",
      assign: "Attribuer",
      revoke: "Retirer",
      assignedTitles: "Titres actuels",
      noAssignedTitles: "Aucun titre",
      assignSuccess: "Titre attribué",
      revokeSuccess: "Titre retiré",
      saveError: "Échec de la mise à jour",
      metrics: [
        { label: "Titres", value: "Admin" },
        { label: "Mode", value: "Admin" },
        { label: "Badges", value: "Quiz" },
      ],
    },
  },
};

function hasPermission(user, permission) {
  return user?.permissions?.includes(permission);
}

function canManageTitles(user) {
  return (
    hasPermission(user, MANAGE_TITLE_PERMISSION) ||
    hasPermission(user, MANAGE_SYSTEM_PERMISSION) ||
    hasPermission(user, MANAGE_BADGE_PERMISSION)
  );
}

function getTitleName(title, lang) {
  return title?.name?.[lang] || title?.name?.zh || title?.code || "-";
}

function getFrameOption(frameStyle) {
  return (
    TITLE_FRAME_OPTIONS.find((option) => option.value === frameStyle) ||
    TITLE_FRAME_OPTIONS[0]
  );
}

function getFrameLabel(frameStyle, lang) {
  const option = getFrameOption(frameStyle);

  return option.label[lang] || option.label.zh;
}

function getTitleFrameClass(styles, frameStyle) {
  const option = getFrameOption(frameStyle);

  return `${styles.titleFrame} ${styles[option.className]}`;
}

function getRecipientSearchText(recipient) {
  return [
    recipient.name,
    recipient.email,
    recipient.jobRole,
    recipient.restaurant?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function groupRecipientsByStore(recipients) {
  const groups = new Map();

  for (const recipient of recipients) {
    const storeName = recipient.restaurant?.name || "-";
    const key = recipient.restaurant?.id ? String(recipient.restaurant.id) : storeName;
    const current = groups.get(key);

    if (current) {
      current.recipients.push(recipient);
      continue;
    }

    groups.set(key, {
      key,
      storeName,
      recipients: [recipient],
    });
  }

  return Array.from(groups.values());
}

function normalizeError(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const EMPTY_TITLE_FORM = {
  nameZh: "",
  nameEn: "",
  nameFr: "",
  frameStyle: "red",
};

export default function TrainingTitleAssignmentPage() {
  const { user, isLoading } = useAuth();
  const toast = useToast();
  const canAssignTitles = canManageTitles(user);
  const [titles, setTitles] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedTitleCode, setSelectedTitleCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [titleForm, setTitleForm] = useState(EMPTY_TITLE_FORM);
  const [isCreatingTitle, setIsCreatingTitle] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadTitleData() {
      if (!canAssignTitles) {
        setTitles([]);
        setRecipients([]);
        setSelectedTitleCode("");
        return;
      }

      setIsLoadingData(true);
      setErrorMessage("");

      try {
        const [nextTitles, nextRecipients] = await Promise.all([
          fetchTrainingTitles(),
          fetchTrainingTitleRecipients(),
        ]);

        if (!isActive) return;

        setTitles(nextTitles);
        setRecipients(nextRecipients);
        setSelectedTitleCode((current) => current || nextTitles[0]?.code || "");
      } catch {
        if (isActive) {
          setTitles([]);
          setRecipients([]);
          setErrorMessage("LOAD_ERROR");
        }
      } finally {
        if (isActive) setIsLoadingData(false);
      }
    }

    void loadTitleData();

    return () => {
      isActive = false;
    };
  }, [canAssignTitles]);

  const selectedTitle = titles.find((title) => title.code === selectedTitleCode);
  const visibleRecipients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return recipients;

    return recipients.filter((recipient) =>
      getRecipientSearchText(recipient).includes(query),
    );
  }, [recipients, searchQuery]);

  async function refreshRecipients() {
    setRecipients(await fetchTrainingTitleRecipients());
  }

  async function refreshTitles(nextSelectedCode) {
    const nextTitles = await fetchTrainingTitles();
    setTitles(nextTitles);
    setSelectedTitleCode(nextSelectedCode || nextTitles[0]?.code || "");
  }

  function updateTitleForm(field, value) {
    setTitleForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateTitle(t) {
    if (isCreatingTitle) return;

    setIsCreatingTitle(true);

    try {
      const createdTitle = await createTrainingTitle({
        nameZh: titleForm.nameZh,
        nameEn: titleForm.nameEn,
        nameFr: titleForm.nameFr,
        frameStyle: titleForm.frameStyle,
        unlockPositionCode: "ALL",
      });

      await refreshTitles(createdTitle.code);
      setTitleForm(EMPTY_TITLE_FORM);
      toast.success(t.page.createSuccess);
    } catch (error) {
      toast.error(normalizeError(error, t.page.createError));
    } finally {
      setIsCreatingTitle(false);
    }
  }

  async function handleAssign(recipient, t, lang) {
    if (!selectedTitleCode) return;

    const nextSavingKey = `${recipient.userId}:${selectedTitleCode}:assign`;
    setSavingKey(nextSavingKey);

    try {
      await assignTrainingTitle(selectedTitleCode, recipient.userId);
      await refreshRecipients();
      toast.success(`${t.page.assignSuccess}: ${getTitleName(selectedTitle, lang)}`);
    } catch (error) {
      toast.error(normalizeError(error, t.page.saveError));
    } finally {
      setSavingKey("");
    }
  }

  async function handleRevoke(recipient, titleCode, t, lang) {
    const title = titles.find((item) => item.code === titleCode);
    const nextSavingKey = `${recipient.userId}:${titleCode}:revoke`;
    setSavingKey(nextSavingKey);

    try {
      await revokeTrainingTitle(titleCode, recipient.userId);
      await refreshRecipients();
      toast.success(`${t.page.revokeSuccess}: ${getTitleName(title, lang)}`);
    } catch (error) {
      toast.error(normalizeError(error, t.page.saveError));
    } finally {
      setSavingKey("");
    }
  }

  return (
    <TrainingLayout pageCopy={PAGE_COPY}>
      {({ lang, t, styles }) => {
        const groupedRecipients = groupRecipientsByStore(visibleRecipients);

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
                  <p className={styles.materialLoadError}>{t.page.loadError}</p>
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
            ) : !canAssignTitles ? (
              <section className={styles.permissionDenied}>
                <h2>{t.page.deniedTitle}</h2>
                <p>{t.page.deniedDetail}</p>
              </section>
            ) : isLoadingData ? (
              <section className={styles.materialEmpty}>
                {t.page.loadingData}
              </section>
            ) : (
              <section className={styles.titleAssignmentWrap}>
                <div className={styles.titleCreatePanel}>
                  <div className={styles.titleCreateHeader}>
                    <p className={styles.permissionSectionHead}>
                      {t.page.createHeading}
                    </p>
                  </div>
                  <label className={styles.titleAssignmentField}>
                    <span>{t.page.createNameZh}</span>
                    <input
                      value={titleForm.nameZh}
                      onChange={(event) => updateTitleForm("nameZh", event.target.value)}
                    />
                  </label>
                  <label className={styles.titleAssignmentField}>
                    <span>{t.page.createNameEn}</span>
                    <input
                      value={titleForm.nameEn}
                      onChange={(event) => updateTitleForm("nameEn", event.target.value)}
                    />
                  </label>
                  <label className={styles.titleAssignmentField}>
                    <span>{t.page.createNameFr}</span>
                    <input
                      value={titleForm.nameFr}
                      onChange={(event) => updateTitleForm("nameFr", event.target.value)}
                    />
                  </label>
                  <label className={styles.titleAssignmentField}>
                    <span>{t.page.createFrameStyle}</span>
                    <select
                      value={titleForm.frameStyle}
                      onChange={(event) =>
                        updateTitleForm("frameStyle", event.target.value)
                      }
                    >
                      {TITLE_FRAME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[lang]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.titleFramePreview}>
                    <span>{t.page.framePreview}</span>
                    <strong className={getTitleFrameClass(styles, titleForm.frameStyle)}>
                      {titleForm.nameZh || getFrameLabel(titleForm.frameStyle, lang)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className={styles.permissionSaveButton}
                    disabled={isCreatingTitle}
                    onClick={() => handleCreateTitle(t)}
                  >
                    {isCreatingTitle ? "..." : t.page.createSubmit}
                  </button>
                </div>

                {titles.length === 0 ? (
                  <section className={styles.materialEmpty}>
                    {t.page.emptyTitles}
                  </section>
                ) : null}

                <div className={styles.titleAssignmentToolbar}>
                  <label className={styles.titleAssignmentField}>
                    <span>{t.page.selectedTitle}</span>
                    <select
                      value={selectedTitleCode}
                      onChange={(event) => setSelectedTitleCode(event.target.value)}
                      disabled={titles.length === 0}
                    >
                      {titles.map((title) => (
                        <option key={title.code} value={title.code}>
                          {getTitleName(title, lang)} · {title.unlockPositionCode}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedTitle ? (
                    <div className={styles.titleSelectedPreview}>
                      <span className={getTitleFrameClass(styles, selectedTitle.frameStyle)}>
                        {getTitleName(selectedTitle, lang)}
                      </span>
                      <small>{getFrameLabel(selectedTitle.frameStyle, lang)}</small>
                    </div>
                  ) : null}
                  <label className={styles.titleAssignmentField}>
                    <span>{t.page.searchLabel}</span>
                    <input
                      type="search"
                      value={searchQuery}
                      placeholder={t.page.searchPlaceholder}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </label>
                </div>

                {groupedRecipients.length > 0 ? (
                  <>
                    <nav
                      className={styles.permissionStoreJumpNav}
                      aria-label={t.page.storeJumpLabel}
                    >
                      <span className={styles.permissionStoreJumpLabel}>
                        {t.page.storeJumpLabel}
                      </span>
                      <div className={styles.permissionStoreJumpButtons}>
                        {groupedRecipients.map((group) => (
                          <a
                            key={group.key}
                            className={styles.permissionStoreJumpButton}
                            href={`#title-store-${group.key}`}
                          >
                            {group.storeName}
                            <strong>{group.recipients.length}</strong>
                          </a>
                        ))}
                      </div>
                    </nav>

                    <div className={styles.permissionStoreGroups}>
                      {groupedRecipients.map((group) => (
                        <section
                          key={group.key}
                          id={`title-store-${group.key}`}
                          className={styles.permissionStoreGroup}
                        >
                          <h2 className={styles.titleAssignmentStoreTitle}>
                            <span>{group.storeName}</span>
                            <small>
                              {group.recipients.length} {t.page.memberCountSuffix}
                            </small>
                          </h2>

                          <div className={styles.permissionUserGrid}>
                            {group.recipients.map((recipient) => {
                              const hasSelectedTitle = recipient.titles.some(
                                (title) => title.code === selectedTitleCode,
                              );
                              const actionSavingKey = `${recipient.userId}:${selectedTitleCode}:${
                                hasSelectedTitle ? "revoke" : "assign"
                              }`;

                              return (
                                <article
                                  key={recipient.userId}
                                  className={styles.permissionUserCard}
                                >
                                  <header className={styles.permissionUserHead}>
                                    <div className={styles.permissionUserIdentity}>
                                      <strong>{recipient.name}</strong>
                                      <span>{recipient.email}</span>
                                    </div>
                                    <span className={styles.permissionStatusPill}>
                                      {recipient.accountStatus}
                                    </span>
                                  </header>

                                  <div className={styles.permissionUserMeta}>
                                    <span className={styles.permissionReadOnlyPill}>
                                      {recipient.jobRole || "-"}
                                    </span>
                                    <span className={styles.permissionReadOnlyPill}>
                                      {hasSelectedTitle
                                        ? t.page.assignedTitle
                                        : t.page.unassignedTitle}
                                    </span>
                                  </div>

                                  <section className={styles.permissionCardSection}>
                                    <div className={styles.permissionSectionHead}>
                                      <span>{t.page.assignedTitles}</span>
                                    </div>
                                    {recipient.titles.length > 0 ? (
                                      <div className={styles.titleAssignmentChips}>
                                        {recipient.titles.map((title) => {
                                          const revokeKey = `${recipient.userId}:${title.code}:revoke`;

                                          return (
                                            <button
                                              key={title.code}
                                              type="button"
                                              className={styles.titleAssignmentChip}
                                              disabled={savingKey === revokeKey}
                                              onClick={() =>
                                                handleRevoke(
                                                  recipient,
                                                  title.code,
                                                  t,
                                                  lang,
                                                )
                                              }
                                            >
                                              <span
                                                className={getTitleFrameClass(
                                                  styles,
                                                  title.frameStyle,
                                                )}
                                              >
                                                {getTitleName(title, lang)}
                                              </span>
                                              <small>{t.page.revoke}</small>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className={styles.permissionMutedText}>
                                        {t.page.noAssignedTitles}
                                      </p>
                                    )}
                                  </section>

                                  <footer className={styles.permissionCardFooter}>
                                    <button
                                      type="button"
                                      className={styles.permissionSaveButton}
                                      disabled={
                                        !selectedTitleCode ||
                                        savingKey === actionSavingKey
                                      }
                                      onClick={() =>
                                        hasSelectedTitle
                                          ? handleRevoke(
                                              recipient,
                                              selectedTitleCode,
                                              t,
                                              lang,
                                            )
                                          : handleAssign(recipient, t, lang)
                                      }
                                    >
                                      {hasSelectedTitle ? t.page.revoke : t.page.assign}
                                    </button>
                                  </footer>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </>
                ) : (
                  <section className={styles.materialEmpty}>
                    {t.page.emptyUsers}
                  </section>
                )}
              </section>
            )}
          </>
        );
      }}
    </TrainingLayout>
  );
}
