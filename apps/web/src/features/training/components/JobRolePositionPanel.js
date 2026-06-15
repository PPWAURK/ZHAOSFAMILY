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
    heading: "岗位映射 · 岗位 → 培训岗位",
    lede: "每个员工岗位(jobRole)解析到哪些培训岗位码,决定该岗位看到的必修/选修资料。未映射的岗位只会解析到 ALL 通用资料。",
    role: "员工岗位",
    position: "锚点培训岗位",
    descendants: "含下级岗位",
    grantsAll: "可见全部岗位",
    preview: "预览",
    save: "保存",
    saving: "保存中",
    remove: "清除映射",
    unmapped: "未映射",
    previewResult: (req, opt) => `将获得 ${req} 必修 / ${opt} 选修`,
    diagTitle: "诊断",
    diagUnmapped: "未映射岗位",
    diagEmpty: "解析后无资料的岗位",
    diagNoMaterials: "无资料的培训岗位",
    diagOrphans: "孤儿资料岗位码",
    none: "无",
    loadError: "加载失败",
  },
  en: {
    heading: "Role mapping · job role → training position",
    lede: "Which training position codes each job role resolves to — this drives the required/optional materials that role sees. Unmapped roles resolve only to the shared ALL materials.",
    role: "Job role",
    position: "Anchor position",
    descendants: "Include descendants",
    grantsAll: "Sees all positions",
    preview: "Preview",
    save: "Save",
    saving: "Saving",
    remove: "Clear mapping",
    unmapped: "Unmapped",
    previewResult: (req, opt) => `${req} required / ${opt} optional`,
    diagTitle: "Diagnostics",
    diagUnmapped: "Unmapped roles",
    diagEmpty: "Roles resolving to nothing",
    diagNoMaterials: "Positions without materials",
    diagOrphans: "Orphan material codes",
    none: "none",
    loadError: "Failed to load",
  },
  fr: {
    heading: "Mapping des postes · rôle → poste de formation",
    lede: "Les codes de poste de formation auxquels chaque rôle est résolu — cela détermine les supports obligatoires/optionnels vus. Les rôles non mappés ne voient que les supports ALL partagés.",
    role: "Rôle",
    position: "Poste d'ancrage",
    descendants: "Inclure les sous-postes",
    grantsAll: "Voit tous les postes",
    preview: "Aperçu",
    save: "Enregistrer",
    saving: "En cours",
    remove: "Effacer",
    unmapped: "Non mappé",
    previewResult: (req, opt) => `${req} obligatoires / ${opt} optionnels`,
    diagTitle: "Diagnostics",
    diagUnmapped: "Rôles non mappés",
    diagEmpty: "Rôles sans support",
    diagNoMaterials: "Postes sans support",
    diagOrphans: "Codes orphelins",
    none: "aucun",
    loadError: "Échec du chargement",
  },
};

function buildDraft(mapping) {
  return {
    positionCode: mapping?.positionCode || "ALL",
    includeDescendants: Boolean(mapping?.includeDescendants),
    grantsAllPositions: Boolean(mapping?.grantsAllPositions),
    exists: Boolean(mapping),
  };
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

    return [
      { label: t.diagUnmapped, values: diagnostics.unmappedJobRoles },
      { label: t.diagEmpty, values: diagnostics.rolesResolvingToEmpty },
      { label: t.diagNoMaterials, values: diagnostics.positionsWithoutMaterials },
      { label: t.diagOrphans, values: diagnostics.orphanMaterials },
    ];
  }, [diagnostics, t]);

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <h3 className={styles.heading}>{t.heading}</h3>
        <p className={styles.lede}>{t.lede}</p>
        {message ? <p className={styles.error}>{message}</p> : null}
      </header>

      {diagnostics ? (
        <ul className={styles.diag}>
          {diagRows.map((row) => (
            <li key={row.label}>
              <span className={styles.diagLabel}>{row.label}</span>
              <span className={styles.diagValue}>
                {row.values.length > 0 ? row.values.join(", ") : t.none}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.table}>
        <div className={`${styles.row} ${styles.headerRow}`}>
          <span>{t.role}</span>
          <span>{t.position}</span>
          <span>{t.descendants}</span>
          <span>{t.grantsAll}</span>
          <span />
        </div>

        {roles.map((role) => {
          const draft = drafts[role];
          if (!draft) return null;
          const isBusy = busyRole === role;
          const previewResult = previews[role];

          return (
            <div key={role} className={styles.row}>
              <span className={styles.roleCell}>
                <strong>{getJobRoleLabel(role, lang)}</strong>
                <code>{role}</code>
                {!draft.exists ? (
                  <em className={styles.unmapped}>{t.unmapped}</em>
                ) : null}
              </span>

              <select
                value={draft.positionCode}
                disabled={isBusy}
                onChange={(event) =>
                  patchDraft(role, { positionCode: event.target.value })
                }
              >
                {positions.map((position) => (
                  <option key={position.code} value={position.code}>
                    {position.code} · {getTrainingPositionLabel(position, lang)}
                  </option>
                ))}
              </select>

              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={draft.includeDescendants}
                  disabled={isBusy || draft.grantsAllPositions}
                  onChange={(event) =>
                    patchDraft(role, { includeDescendants: event.target.checked })
                  }
                />
              </label>

              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={draft.grantsAllPositions}
                  disabled={isBusy}
                  onChange={(event) =>
                    patchDraft(role, { grantsAllPositions: event.target.checked })
                  }
                />
              </label>

              <span className={styles.actions}>
                {previewResult ? (
                  <em className={styles.previewResult}>
                    {t.previewResult(
                      previewResult.requiredCount,
                      previewResult.optionalCount,
                    )}
                  </em>
                ) : null}
                <button type="button" disabled={isBusy} onClick={() => preview(role)}>
                  {t.preview}
                </button>
                <button type="button" disabled={isBusy} onClick={() => save(role)}>
                  {isBusy ? t.saving : t.save}
                </button>
                {draft.exists ? (
                  <button
                    type="button"
                    className={styles.remove}
                    disabled={isBusy}
                    onClick={() => remove(role)}
                  >
                    {t.remove}
                  </button>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
