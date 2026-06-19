"use client";

import { useEffect, useMemo, useState } from "react";

import {
  deleteJobRolePosition,
  fetchJobRolePositions,
  fetchManagedTrainingPositions,
  fetchTrainingDiagnostics,
  fetchTrainingResolvePreview,
  upsertJobRolePosition,
} from "@/features/training/services/trainingMediaApi";
import {
  flattenTrainingPositions,
  getTrainingPositionLabel,
} from "@/features/training/utils/trainingPositions";
import {
  getJobRoleLabel,
  normalizeJobRoleValues,
} from "@/shared/constants/job-roles";

import styles from "./job-role-position-panel.module.css";

const COPY = {
  zh: {
    eyebrow: "培训可见规则",
    heading: "员工岗位看到哪些培训资料",
    lede: "这里把员工档案里的岗位连接到培训资料分类。配置后，员工进入培训中心时会自动看到对应的必修和选修内容。",
    guidePosition: "选择资料分类",
    guidePositionText: "比如店长对应 SM，收银对应 FRONT_CASHIER。",
    guideDescendants: "是否查看整组细分岗位",
    guideDescendantsText: "开启后会看到该分类下所有子岗位资料。适合经理、助理、全能岗；普通单一岗位不建议开启。",
    guideAll: "是否查看全部资料",
    guideAllText: "适合总部、区域经理、店长等需要跨岗位查看的人。",
    mappingTitle: "岗位配置",
    mappingHint: "每张卡只管理一个员工岗位。改完后点保存；不确定结果时先点预览。",
    roleCode: "系统岗位码",
    position: "学习资料分类",
    positionHint: "这个员工岗位默认学习哪一类培训资料。",
    descendants: "可查看该分类下所有细分岗位资料",
    descendantsHint: "例如选择 FOH · 前厅后，开启此项会同时看到迎宾、收银、服务员等前厅子岗位资料。普通单一岗位不建议开启。",
    grantsAll: "可查看全部岗位资料",
    grantsAllHint: "开启后会覆盖普通岗位范围，适合管理岗。",
    preview: "预览可见资料",
    save: "保存",
    saving: "保存中",
    remove: "清除映射",
    unmapped: "未映射",
    noRoles: "暂无需要配置的岗位。",
    previewResult: (req, opt) => `将获得 ${req} 必修 / ${opt} 选修`,
    diagTitle: "配置状态",
    diagHint: "先看这里就能知道哪些地方需要处理。",
    diagUnmapped: "还没配置的员工岗位",
    diagEmpty: "配置后仍看不到资料",
    diagNoMaterials: "还没有资料的分类",
    diagOrphans: "资料使用了未知分类",
    diagOk: "正常",
    none: "无",
    loadError: "加载失败",
  },
  en: {
    eyebrow: "Training visibility rules",
    heading: "Which training each job role sees",
    lede: "Connect each employee job role to a training material category. Employees then see the right required and optional materials automatically.",
    guidePosition: "Choose a category",
    guidePositionText: "For example, store manager maps to SM and cashier maps to FRONT_CASHIER.",
    guideDescendants: "Include child roles",
    guideDescendantsText: "Useful for broad roles such as FOH or BOH that should include detailed role materials.",
    guideAll: "See every category",
    guideAllText: "Useful for holding, regional managers, and store managers who need cross-role visibility.",
    mappingTitle: "Role setup",
    mappingHint: "Each card controls one employee job role. Save after editing; preview first when unsure.",
    roleCode: "System role code",
    position: "Training category",
    positionHint: "The default training category this employee role should learn from.",
    descendants: "Also include child-role materials",
    descendantsHint: "For example, FOH can include host, cashier, server, and related materials.",
    grantsAll: "Can view all role materials",
    grantsAllHint: "Overrides the normal role scope. Best for management roles.",
    preview: "Preview visible materials",
    save: "Save",
    saving: "Saving",
    remove: "Clear mapping",
    unmapped: "Unmapped",
    noRoles: "No roles to configure.",
    previewResult: (req, opt) => `${req} required / ${opt} optional`,
    diagTitle: "Setup status",
    diagHint: "Use this first to spot what needs attention.",
    diagUnmapped: "Employee roles not configured",
    diagEmpty: "Configured roles with no materials",
    diagNoMaterials: "Categories without materials",
    diagOrphans: "Materials using unknown categories",
    diagOk: "OK",
    none: "none",
    loadError: "Failed to load",
  },
  fr: {
    eyebrow: "Règles de visibilité formation",
    heading: "Quelles formations chaque poste voit",
    lede: "Reliez chaque poste employé à une catégorie de formation. Les employés verront automatiquement les supports obligatoires et optionnels adaptés.",
    guidePosition: "Choisir une catégorie",
    guidePositionText: "Par exemple, responsable de restaurant vers SM et caisse vers FRONT_CASHIER.",
    guideDescendants: "Inclure les sous-postes",
    guideDescendantsText: "Utile pour les postes larges comme FOH ou BOH qui doivent inclure les supports détaillés.",
    guideAll: "Voir toutes les catégories",
    guideAllText: "Utile pour le holding, les responsables régionaux et les managers.",
    mappingTitle: "Configuration des postes",
    mappingHint: "Chaque carte règle un poste employé. Enregistrez après modification ; prévisualisez en cas de doute.",
    roleCode: "Code poste système",
    position: "Catégorie formation",
    positionHint: "La catégorie de formation par défaut pour ce poste employé.",
    descendants: "Inclure aussi les supports des sous-postes",
    descendantsHint: "Par exemple, FOH peut inclure accueil, caisse, service et supports liés.",
    grantsAll: "Peut voir tous les postes",
    grantsAllHint: "Remplace le périmètre normal. À réserver aux postes de gestion.",
    preview: "Prévisualiser",
    save: "Enregistrer",
    saving: "En cours",
    remove: "Effacer",
    unmapped: "Non mappé",
    noRoles: "Aucun poste à configurer.",
    previewResult: (req, opt) => `${req} obligatoires / ${opt} optionnels`,
    diagTitle: "État de configuration",
    diagHint: "Commencez ici pour repérer ce qui demande attention.",
    diagUnmapped: "Postes employés non configurés",
    diagEmpty: "Postes configurés sans support",
    diagNoMaterials: "Catégories sans support",
    diagOrphans: "Supports avec catégorie inconnue",
    diagOk: "OK",
    none: "aucun",
    loadError: "Échec du chargement",
  },
};

const DIAGNOSTIC_FIELDS = [
  {
    id: "unmapped",
    labelKey: "diagUnmapped",
    valueKey: "unmappedJobRoles",
    type: "role",
  },
  {
    id: "empty",
    labelKey: "diagEmpty",
    valueKey: "rolesResolvingToEmpty",
    type: "role",
  },
  {
    id: "withoutMaterials",
    labelKey: "diagNoMaterials",
    valueKey: "positionsWithoutMaterials",
    type: "position",
  },
  {
    id: "orphans",
    labelKey: "diagOrphans",
    valueKey: "orphanMaterials",
    type: "code",
  },
];

function buildDraft(mapping) {
  return {
    positionCode: mapping?.positionCode || "ALL",
    includeDescendants: Boolean(mapping?.includeDescendants),
    grantsAllPositions: Boolean(mapping?.grantsAllPositions),
    exists: Boolean(mapping),
  };
}

function formatPositionOption(position, lang) {
  return `${position.code} · ${getTrainingPositionLabel(position, lang)}`;
}

function formatDiagnosticValue(value, type, positions, lang) {
  if (type === "role") {
    return getJobRoleLabel(value, lang);
  }

  if (type === "position") {
    const position = positions.find((item) => item.code === value);
    return position ? formatPositionOption(position, lang) : value;
  }

  return value;
}

function DiagnosticCard({ label, values, noneLabel, okLabel }) {
  const hasValues = values.length > 0;

  return (
    <article
      className={`${styles.diagnosticCard} ${
        hasValues ? styles.diagnosticNeedsWork : styles.diagnosticOk
      }`}
    >
      <div className={styles.diagnosticCardHead}>
        <strong>{label}</strong>
        <span>{hasValues ? values.length : okLabel}</span>
      </div>
      <div className={styles.diagnosticValues}>
        {hasValues ? (
          values.map((value) => (
            <span key={value} className={styles.diagnosticChip}>
              {value}
            </span>
          ))
        ) : (
          <span className={styles.diagnosticMuted}>{noneLabel}</span>
        )}
      </div>
    </article>
  );
}

function RoleMappingCard({
  role,
  draft,
  positions,
  previewResult,
  isBusy,
  lang,
  t,
  onPatch,
  onPreview,
  onSave,
  onRemove,
}) {
  return (
    <article
      className={`${styles.roleCard} ${!draft.exists ? styles.roleCardUnmapped : ""}`}
    >
      <div className={styles.roleCardHead}>
        <div>
          <strong>{getJobRoleLabel(role, lang)}</strong>
          <span>
            {t.roleCode}: <code>{role}</code>
          </span>
        </div>
        {!draft.exists ? <em>{t.unmapped}</em> : null}
      </div>

      <label className={styles.fieldGroup}>
        <span>{t.position}</span>
        <small>{t.positionHint}</small>
        <select
          value={draft.positionCode}
          disabled={isBusy}
          onChange={(event) => onPatch(role, { positionCode: event.target.value })}
        >
          {positions.map((position) => (
            <option key={position.code} value={position.code}>
              {formatPositionOption(position, lang)}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.optionGrid}>
        <label
          className={`${styles.optionBox} ${
            draft.includeDescendants ? styles.optionBoxActive : ""
          }`}
        >
          <input
            type="checkbox"
            checked={draft.includeDescendants}
            disabled={isBusy || draft.grantsAllPositions}
            onChange={(event) =>
              onPatch(role, { includeDescendants: event.target.checked })
            }
          />
          <span>
            <strong>{t.descendants}</strong>
            <small>{t.descendantsHint}</small>
          </span>
        </label>

        <label
          className={`${styles.optionBox} ${
            draft.grantsAllPositions ? styles.optionBoxActive : ""
          }`}
        >
          <input
            type="checkbox"
            checked={draft.grantsAllPositions}
            disabled={isBusy}
            onChange={(event) =>
              onPatch(role, { grantsAllPositions: event.target.checked })
            }
          />
          <span>
            <strong>{t.grantsAll}</strong>
            <small>{t.grantsAllHint}</small>
          </span>
        </label>
      </div>

      <footer className={styles.cardFooter}>
        <div className={styles.previewSlot}>
          {previewResult ? (
            <span>
              {t.previewResult(
                previewResult.requiredCount,
                previewResult.optionalCount,
              )}
            </span>
          ) : null}
        </div>
        <div className={styles.cardActions}>
          <button type="button" disabled={isBusy} onClick={() => onPreview(role)}>
            {t.preview}
          </button>
          <button
            type="button"
            className={styles.primaryAction}
            disabled={isBusy}
            onClick={() => onSave(role)}
          >
            {isBusy ? t.saving : t.save}
          </button>
          {draft.exists ? (
            <button
              type="button"
              className={styles.removeAction}
              disabled={isBusy}
              onClick={() => onRemove(role)}
            >
              {t.remove}
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

export default function JobRolePositionPanel({ lang = "zh" }) {
  const t = COPY[lang] || COPY.zh;
  const [positions, setPositions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [roles, setRoles] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [previews, setPreviews] = useState({});
  const [busyRole, setBusyRole] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    const [mappings, positionTree, diag] = await Promise.all([
      fetchJobRolePositions(),
      fetchManagedTrainingPositions(),
      fetchTrainingDiagnostics(),
    ]);

    const flat = flattenTrainingPositions(positionTree).filter(
      (position) => position.isActive,
    );
    const mappingByRole = new Map(mappings.map((m) => [m.jobRole, m]));
    const allRoles = normalizeJobRoleValues([
      ...mappings.map((m) => m.jobRole),
      ...diag.unmappedJobRoles,
    ]);
    const nextDrafts = {};
    for (const role of allRoles) {
      nextDrafts[role] = buildDraft(mappingByRole.get(role));
    }

    setPositions(flat);
    setRoles(allRoles);
    setDrafts(nextDrafts);
    setDiagnostics(diag);
  }

  useEffect(() => {
    let active = true;

    load().catch((error) => {
      if (active) setMessage(error?.message || t.loadError);
    });

    return () => {
      active = false;
    };
  }, []);

  function patchDraft(role, patch) {
    setDrafts((current) => ({
      ...current,
      [role]: { ...current[role], ...patch },
    }));
  }

  async function save(role) {
    const draft = drafts[role];
    setBusyRole(role);
    setMessage("");

    try {
      await upsertJobRolePosition(role, {
        positionCode: draft.positionCode,
        includeDescendants: draft.includeDescendants,
        grantsAllPositions: draft.grantsAllPositions,
      });
      patchDraft(role, { exists: true });
      const preview = await fetchTrainingResolvePreview(role);
      setPreviews((current) => ({ ...current, [role]: preview }));
      await load();
    } catch (error) {
      setMessage(error?.message || t.loadError);
    } finally {
      setBusyRole(null);
    }
  }

  async function remove(role) {
    setBusyRole(role);
    setMessage("");

    try {
      await deleteJobRolePosition(role);
      setPreviews((current) => {
        const next = { ...current };
        delete next[role];
        return next;
      });
      await load();
    } catch (error) {
      setMessage(error?.message || t.loadError);
    } finally {
      setBusyRole(null);
    }
  }

  async function preview(role) {
    setBusyRole(role);
    setMessage("");

    try {
      const result = await fetchTrainingResolvePreview(role);
      setPreviews((current) => ({ ...current, [role]: result }));
    } catch (error) {
      setMessage(error?.message || t.loadError);
    } finally {
      setBusyRole(null);
    }
  }

  const diagRows = useMemo(() => {
    if (!diagnostics) return [];

    return DIAGNOSTIC_FIELDS.map((field) => ({
      id: field.id,
      label: t[field.labelKey],
      values: (diagnostics[field.valueKey] || []).map((value) =>
        formatDiagnosticValue(value, field.type, positions, lang),
      ),
    }));
  }, [diagnostics, positions, lang, t]);

  return (
    <section className={styles.panel}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>{t.eyebrow}</span>
        <div className={styles.heroText}>
          <h3 className={styles.heading}>{t.heading}</h3>
          <p className={styles.lede}>{t.lede}</p>
        </div>
        {message ? <p className={styles.error}>{message}</p> : null}
      </header>

      <div className={styles.guideGrid}>
        <article>
          <strong>01</strong>
          <span>{t.guidePosition}</span>
          <p>{t.guidePositionText}</p>
        </article>
        <article>
          <strong>02</strong>
          <span>{t.guideDescendants}</span>
          <p>{t.guideDescendantsText}</p>
        </article>
        <article>
          <strong>03</strong>
          <span>{t.guideAll}</span>
          <p>{t.guideAllText}</p>
        </article>
      </div>

      {diagnostics ? (
        <section className={styles.diagnosticSection}>
          <div className={styles.sectionIntro}>
            <h4>{t.diagTitle}</h4>
            <p>{t.diagHint}</p>
          </div>
          <div className={styles.diagnosticGrid}>
            {diagRows.map((row) => (
              <DiagnosticCard
                key={row.id}
                label={row.label}
                values={row.values}
                noneLabel={t.none}
                okLabel={t.diagOk}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.mappingSection}>
        <div className={styles.sectionIntro}>
          <h4>{t.mappingTitle}</h4>
          <p>{t.mappingHint}</p>
        </div>

        {roles.length > 0 ? (
          <div className={styles.roleGrid}>
            {roles.map((role) => {
              const draft = drafts[role];
              if (!draft) return null;

              return (
                <RoleMappingCard
                  key={role}
                  role={role}
                  draft={draft}
                  positions={positions}
                  previewResult={previews[role]}
                  isBusy={busyRole === role}
                  lang={lang}
                  t={t}
                  onPatch={patchDraft}
                  onPreview={preview}
                  onSave={save}
                  onRemove={remove}
                />
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>{t.noRoles}</p>
        )}
      </section>
    </section>
  );
}
