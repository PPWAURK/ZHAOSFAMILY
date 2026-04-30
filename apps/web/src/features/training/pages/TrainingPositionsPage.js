"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  createTrainingPosition,
  fetchManagedTrainingPositions,
  updateTrainingPosition,
} from "@/features/training/services/trainingMediaApi";
import {
  DEFAULT_TRAINING_POSITION_TREE,
  TRAINING_POSITION_MANAGE_PERMISSION,
  flattenTrainingPositions,
  getTrainingPositionLabel,
} from "@/features/training/utils/trainingPositions";

const EMPTY_FORM = {
  code: "",
  nameZh: "",
  nameEn: "",
  nameFr: "",
  parentCode: "FOH",
  sortOrder: 100,
};

const PAGE_COPY = {
  zh: {
    shared: TRAINING_COPY.zh.shared,
    page: {
      topStage: "岗位管理 · POSITIONS",
      kicker: "ZHAO's · 培训 · 岗位",
      title: "岗位",
      titleEm: "管理",
      titleSuffix: "。",
      lede: "维护培训资料使用的岗位大类和细分岗位。停用岗位不会再用于新资料，但历史资料仍可显示。",
      stepLabel: "STEP 05",
      stepDetail: "TRAINING POSITIONS · 仅岗位管理员可见",
    },
  },
  en: {
    shared: TRAINING_COPY.en.shared,
    page: {
      topStage: "Position manager · POSITIONS",
      kicker: "ZHAO's · Training · Positions",
      title: "Position",
      titleEm: "Manager",
      titleSuffix: ".",
      lede: "Manage role groups and detailed training positions. Disabled positions stay visible for historical materials.",
      stepLabel: "STEP 05",
      stepDetail: "TRAINING POSITIONS · Admin only",
    },
  },
  fr: {
    shared: TRAINING_COPY.fr.shared,
    page: {
      topStage: "Gestion postes · POSITIONS",
      kicker: "ZHAO's · Formation · Postes",
      title: "Gestion des",
      titleEm: "Postes",
      titleSuffix: ".",
      lede: "Gérez les familles de postes et les postes détaillés utilisés par la formation.",
      stepLabel: "ÉTAPE 05",
      stepDetail: "TRAINING POSITIONS · Admin uniquement",
    },
  },
};

function normalizeCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function toEditablePosition(position) {
  return {
    nameZh: position.name.zh,
    nameEn: position.name.en,
    nameFr: position.name.fr,
    parentCode: position.parentCode || "FOH",
    sortOrder: position.sortOrder,
    isActive: position.isActive,
  };
}

export default function TrainingPositionsPage() {
  const { user, isLoading } = useAuth();
  const [positions, setPositions] = useState(DEFAULT_TRAINING_POSITION_TREE);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingCode, setEditingCode] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canManagePositions = user?.permissions?.includes(
    TRAINING_POSITION_MANAGE_PERMISSION,
  );
  const flatPositions = useMemo(() => flattenTrainingPositions(positions), [positions]);
  const parentPositions = flatPositions.filter((position) => position.parentCode === null);

  async function loadPositions() {
    const nextPositions = await fetchManagedTrainingPositions();
    setPositions(nextPositions.length > 0 ? nextPositions : DEFAULT_TRAINING_POSITION_TREE);
  }

  useEffect(() => {
    if (!canManagePositions) {
      return;
    }

    let isActive = true;

    async function load() {
      try {
        const nextPositions = await fetchManagedTrainingPositions();
        if (isActive) {
          setPositions(nextPositions.length > 0 ? nextPositions : DEFAULT_TRAINING_POSITION_TREE);
          setMessage("");
        }
      } catch (error) {
        if (isActive) {
          setMessage(error.message || "岗位列表加载失败");
        }
      }
    }

    load();

    return () => {
      isActive = false;
    };
  }, [canManagePositions]);

  async function handleCreatePosition(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      await createTrainingPosition({
        ...form,
        code: normalizeCode(form.code),
        sortOrder: Number(form.sortOrder),
      });
      setForm(EMPTY_FORM);
      await loadPositions();
    } catch (error) {
      setMessage(error.message || "岗位创建失败");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(position) {
    setEditingCode(position.code);
    setEditingForm(toEditablePosition(position));
    setMessage("");
  }

  async function savePosition(code) {
    setIsSaving(true);
    setMessage("");

    try {
      await updateTrainingPosition(code, {
        ...editingForm,
        sortOrder: Number(editingForm.sortOrder),
      });
      setEditingCode(null);
      setEditingForm(null);
      await loadPositions();
    } catch (error) {
      setMessage(error.message || "岗位保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <TrainingLayout pageCopy={PAGE_COPY}>
        {({ styles }) => <section className={styles.materialEmpty}>正在确认权限...</section>}
      </TrainingLayout>
    );
  }

  if (!canManagePositions) {
    return (
      <TrainingLayout pageCopy={PAGE_COPY}>
        {({ styles }) => (
          <section className={styles.permissionDenied}>
            <h2>无权限访问岗位管理</h2>
            <p>需要 training.position.manage 权限。</p>
          </section>
        )}
      </TrainingLayout>
    );
  }

  return (
    <TrainingLayout pageCopy={PAGE_COPY}>
      {({ t, styles }) => (
        <>
          <section className={styles.pageHeaderCard}>
            <div>
              <p className={styles.pageStep}>
                <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                <span>{t.page.stepDetail}</span>
              </p>
              {message ? <p className={styles.materialLoadError}>{message}</p> : null}
            </div>
            <div className={styles.metricGrid}>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>{parentPositions.length}</p>
                <p className={styles.metricLabel}>GROUPS</p>
              </article>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>{flatPositions.length}</p>
                <p className={styles.metricLabel}>POSITIONS</p>
              </article>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>
                  {flatPositions.filter((position) => position.isActive).length}
                </p>
                <p className={styles.metricLabel}>ACTIVE</p>
              </article>
            </div>
          </section>

          <form className={styles.positionManageForm} onSubmit={handleCreatePosition}>
            <input
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: normalizeCode(event.target.value) }))
              }
              placeholder="FOH_WAITER"
            />
            <input
              value={form.nameZh}
              onChange={(event) => setForm((prev) => ({ ...prev, nameZh: event.target.value }))}
              placeholder="中文名称"
            />
            <input
              value={form.nameEn}
              onChange={(event) => setForm((prev) => ({ ...prev, nameEn: event.target.value }))}
              placeholder="English name"
            />
            <input
              value={form.nameFr}
              onChange={(event) => setForm((prev) => ({ ...prev, nameFr: event.target.value }))}
              placeholder="Nom français"
            />
            <select
              value={form.parentCode}
              onChange={(event) => setForm((prev) => ({ ...prev, parentCode: event.target.value }))}
            >
              {parentPositions.map((position) => (
                <option key={position.code} value={position.code}>
                  {position.code} · {getTrainingPositionLabel(position, "zh")}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="排序"
            />
            <button type="submit" disabled={isSaving || !form.code.trim()}>
              {isSaving ? "保存中" : "新增岗位"}
            </button>
          </form>

          <section className={styles.positionManageList}>
            {parentPositions.map((parent) => (
              <article key={parent.code} className={styles.positionManageGroup}>
                <header>
                  <b>{parent.code}</b>
                  <span>{getTrainingPositionLabel(parent, "zh")}</span>
                </header>
                {[parent, ...(parent.children || [])].map((position) => {
                  const isEditing = editingCode === position.code;

                  return (
                    <div key={position.code} className={styles.positionManageRow}>
                      <strong>{position.code}</strong>
                      {isEditing ? (
                        <>
                          <input
                            value={editingForm.nameZh}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, nameZh: event.target.value }))
                            }
                          />
                          <input
                            value={editingForm.nameEn}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, nameEn: event.target.value }))
                            }
                          />
                          <input
                            value={editingForm.nameFr}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, nameFr: event.target.value }))
                            }
                          />
                          {position.parentCode ? (
                            <select
                              value={editingForm.parentCode}
                              onChange={(event) =>
                                setEditingForm((prev) => ({
                                  ...prev,
                                  parentCode: event.target.value,
                                }))
                              }
                            >
                              {parentPositions.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.code}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          <input
                            type="number"
                            min="0"
                            value={editingForm.sortOrder}
                            onChange={(event) =>
                              setEditingForm((prev) => ({
                                ...prev,
                                sortOrder: event.target.value,
                              }))
                            }
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={editingForm.isActive}
                              disabled={position.code === "ALL"}
                              onChange={(event) =>
                                setEditingForm((prev) => ({
                                  ...prev,
                                  isActive: event.target.checked,
                                }))
                              }
                            />
                            启用
                          </label>
                          <button type="button" onClick={() => savePosition(position.code)}>
                            保存
                          </button>
                        </>
                      ) : (
                        <>
                          <span>{getTrainingPositionLabel(position, "zh")}</span>
                          <span>{position.name.en}</span>
                          <span>{position.name.fr}</span>
                          <span>{position.parentCode || "GROUP"}</span>
                          <span>{position.sortOrder}</span>
                          <span>{position.isActive ? "启用" : "停用"}</span>
                          <button type="button" onClick={() => startEditing(position)}>
                            编辑
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </article>
            ))}
          </section>
        </>
      )}
    </TrainingLayout>
  );
}
