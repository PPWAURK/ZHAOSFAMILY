"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import TrainingLayout from "@/features/training/components/TrainingLayout";
import QuizManagerModal from "@/features/training/components/QuizManagerModal";
import { TRAINING_COPY } from "@/features/training/constants/training-copy";
import {
  deleteTrainingMaterial,
  fetchTrainingPositions,
  fetchTrainingMaterials,
  updateTrainingMaterial,
} from "@/features/training/services/trainingMediaApi";
import {
  DEFAULT_TRAINING_POSITION_TREE,
  TRAINING_POSITION_MANAGE_PERMISSION,
  findTrainingPosition,
  flattenTrainingPositions,
  getTrainingPositionLabel,
  getTrainingPositionSecondaryLabel,
  mergeMaterialPositionTabs,
  mergeDefaultTrainingPositions,
} from "@/features/training/utils/trainingPositions";

const MATERIAL_FILTER_TYPES = ["VIDEO", "PDF", "QUIZ", "ARTICLE", "IMAGE", "OTHER"];

function buildInitialFilters(positions) {
  return flattenTrainingPositions(positions).reduce((accumulator, position) => {
    accumulator[position.code] = { type: "all", q: "" };
    return accumulator;
  }, {});
}

function formatMaterialSize(sizeBytes) {
  const size = Number(sizeBytes);
  if (!Number.isFinite(size)) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function toMaterialListItem(material) {
  return {
    id: `TM-${material.id}`,
    pos: material.positionId,
    type: material.type,
    req: Boolean(material.isRequired),
    sort: material.id,
    title: material.title,
    sub: material.description || material.originalName,
    upd: material.createdAt ? material.createdAt.slice(0, 10) : "-",
    size: formatMaterialSize(material.sizeBytes),
    objectKey: material.objectKey,
    materialId: material.id,
    raw: material,
  };
}

export default function TrainingMaterialsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialPosition = searchParams.get("position");
  const [positions, setPositions] = useState(DEFAULT_TRAINING_POSITION_TREE);
  const [activePosition, setActivePosition] = useState(
    flattenTrainingPositions(DEFAULT_TRAINING_POSITION_TREE).some(
      (position) => position.code === initialPosition,
    )
      ? initialPosition
      : "FOH",
  );
  const [positionFilters, setPositionFilters] = useState(() =>
    buildInitialFilters(DEFAULT_TRAINING_POSITION_TREE),
  );
  const [materials, setMaterials] = useState([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [materialsError, setMaterialsError] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [editingForm, setEditingForm] = useState({
    title: "",
    description: "",
    positionId: "FOH",
    type: "VIDEO",
    isRequired: false,
  });
  const [savingMaterialId, setSavingMaterialId] = useState(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState(null);
  const [quizMaterial, setQuizMaterial] = useState(null);

  const permissions = user?.permissions ?? [];
  const canCreateMaterials = permissions.includes("training.material.create");
  const canUpdateMaterials = permissions.includes("training.material.update");
  const canDeleteMaterials = permissions.includes("training.material.delete");
  const canManagePositions = permissions.includes(TRAINING_POSITION_MANAGE_PERMISSION);
  const flatPositions = flattenTrainingPositions(positions);
  const activePositionOptions = flatPositions.filter((position) => position.isActive);

  useEffect(() => {
    let isActive = true;

    async function loadMaterials() {
      setIsLoadingMaterials(true);
      setMaterialsError("");

      try {
        const [nextMaterials, nextPositions] = await Promise.all([
          fetchTrainingMaterials(),
          fetchTrainingPositions(),
        ]);
        if (isActive) {
          setMaterials(nextMaterials.map(toMaterialListItem));
          const nextTabs = mergeMaterialPositionTabs(
            mergeDefaultTrainingPositions(
              nextPositions.length > 0
                ? nextPositions
                : DEFAULT_TRAINING_POSITION_TREE,
            ),
            nextMaterials,
          );
          setPositions(nextTabs);
          setPositionFilters((prev) => ({
            ...buildInitialFilters(nextTabs),
            ...prev,
          }));
          setActivePosition((currentPosition) =>
            findTrainingPosition(nextTabs, currentPosition)
              ? currentPosition
              : flattenTrainingPositions(nextTabs)[0]?.code || "FOH",
          );
        }
      } catch (error) {
        if (isActive) {
          setMaterialsError(error.message || "培训资料加载失败");
        }
      } finally {
        if (isActive) {
          setIsLoadingMaterials(false);
        }
      }
    }

    loadMaterials();

    return () => {
      isActive = false;
    };
  }, []);

  const positionCounts = useMemo(
    () =>
      flatPositions.reduce((accumulator, position) => {
        accumulator[position.code] = materials.filter(
          (item) => item.pos === position.code,
        ).length;
        return accumulator;
      }, {}),
    [flatPositions, materials],
  );
  const metrics = useMemo(
    () => [
      {
        value: String(materials.filter((item) => item.pos === activePosition).length),
        label: `当前岗位 · ${activePosition}`,
      },
      { value: String(materials.length), label: "TOTAL ITEMS" },
      {
        value: String(materials.filter((item) => item.req).length),
        label: "REQUIRED",
      },
    ],
    [activePosition, materials],
  );

  function startEditingMaterial(item) {
    setEditingMaterialId(item.materialId);
    setEditingForm({
      title: item.title,
      description: item.raw.description || "",
      positionId: item.raw.positionId,
      type: item.raw.type,
      isRequired: Boolean(item.raw.isRequired),
    });
    setMaterialsError("");
  }

  function cancelEditingMaterial() {
    setEditingMaterialId(null);
    setEditingForm({
      title: "",
      description: "",
      positionId: "FOH",
      type: "VIDEO",
      isRequired: false,
    });
  }

  async function saveMaterial(materialId) {
    const nextTitle = editingForm.title.trim();

    if (!nextTitle) {
      setMaterialsError("资料标题不能为空");
      return;
    }

    setSavingMaterialId(materialId);
    setMaterialsError("");

    try {
      const updatedMaterial = await updateTrainingMaterial(materialId, {
        title: nextTitle,
        description: editingForm.description.trim(),
        positionId: editingForm.positionId,
        type: editingForm.type,
        isRequired: editingForm.isRequired,
      });
      const updatedItem = toMaterialListItem(updatedMaterial);
      setMaterials((prev) =>
        prev.map((item) =>
          item.materialId === materialId ? updatedItem : item,
        ),
      );
      cancelEditingMaterial();
    } catch (error) {
      setMaterialsError(error.message || "资料标题保存失败");
    } finally {
      setSavingMaterialId(null);
    }
  }

  async function deleteMaterial(materialId) {
    const shouldDelete = window.confirm(
      "确认删除这份培训资料？此操作会同时删除文件和数据库记录，无法撤销。",
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingMaterialId(materialId);
    setMaterialsError("");

    try {
      await deleteTrainingMaterial(materialId);
      setMaterials((prev) =>
        prev.filter((item) => item.materialId !== materialId),
      );
      if (editingMaterialId === materialId) {
        cancelEditingMaterial();
      }
    } catch (error) {
      setMaterialsError(error.message || "资料删除失败");
    } finally {
      setDeletingMaterialId(null);
    }
  }

  return (
    <TrainingLayout
      pageCopy={{
        zh: { shared: TRAINING_COPY.zh.shared, page: TRAINING_COPY.zh.materials },
        en: { shared: TRAINING_COPY.en.shared, page: TRAINING_COPY.en.materials },
        fr: { shared: TRAINING_COPY.fr.shared, page: TRAINING_COPY.fr.materials },
      }}
    >
      {({ t, styles }) => (
        <>
          <section className={styles.pageHeaderCard}>
            <div>
              <p className={styles.pageStep}>
                <span className={styles.stepBadge}>{t.page.stepLabel}</span>
                <span>{t.page.stepDetail}</span>
              </p>
              {canCreateMaterials ? (
                <Link href="/dashboard/training/upload" className={styles.uploadEntryLink}>
                  上传
                </Link>
              ) : null}
              {canManagePositions ? (
                <Link href="/dashboard/training/positions" className={styles.uploadEntryLink}>
                  岗位管理
                </Link>
              ) : null}
              {materialsError ? (
                <p className={styles.materialLoadError}>{materialsError}</p>
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

          <div className={styles.positionTabs}>
            {flatPositions.map((position, index) => (
              <button
                key={position.code}
                type="button"
                className={`${styles.positionTab} ${
                  activePosition === position.code ? styles.positionTabActive : ""
                }`}
                onClick={() => setActivePosition(position.code)}
              >
                <span className={styles.positionTabNum}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.positionTabName}>
                  {getTrainingPositionLabel(position, "zh")}
                </span>
                <span className={styles.positionTabEn}>
                  {getTrainingPositionSecondaryLabel(position, "zh")}
                </span>
                <span className={styles.positionTabCount}>{positionCounts[position.code]}</span>
              </button>
            ))}
          </div>

          {flatPositions.map((position, index) => {
            const filters = positionFilters[position.code] || { type: "all", q: "" };
            const totalItems = materials.filter((item) => item.pos === position.code);
            const requiredCount = totalItems.filter((item) => item.req).length;
            const hasActiveFilters = filters.type !== "all" || Boolean(filters.q);
            const visibleItems = totalItems
              .filter((item) =>
                filters.type === "all"
                  ? true
                  : filters.type === "REQ"
                    ? item.req
                    : item.type === filters.type,
              )
              .filter((item) => {
                if (!filters.q) {
                  return true;
                }

                return `${item.title}${item.sub}${item.id}${item.objectKey || ""}`
                  .toLowerCase()
                  .includes(filters.q.toLowerCase());
              })
              .sort((left, right) => left.sort - right.sort);

            return (
              <section
                key={position.code}
                className={`${styles.positionBlock} ${
                  activePosition === position.code ? styles.positionBlockActive : styles.positionBlockHidden
                }`}
              >
                <div className={styles.positionBlockHead}>
                  <div className={styles.positionBlockIndex}>
                    {String(index + 1).padStart(2, "0")} / {position.code}
                  </div>
                  <h3 className={styles.positionBlockTitle}>
                    {getTrainingPositionLabel(position, "zh")}
                    <span className={styles.positionBlockTitleEn}>
                      {getTrainingPositionSecondaryLabel(position, "zh")}
                    </span>
                    {!position.isActive ? (
                      <span className={styles.positionMineChip}>已停用</span>
                    ) : null}
                  </h3>
                  <div className={styles.positionBlockStats}>
                    <span>
                      {t.page.reqLabel} · <b>{requiredCount}</b>
                    </span>
                    <span>
                      {t.page.totalLabel} · <b>{totalItems.length}</b>
                    </span>
                  </div>
                </div>

                <p className={styles.positionBlockDesc}>
                  {position.desc || `${position.code} · Training position`}
                </p>

                <div className={styles.positionFilters}>
                  <button
                    type="button"
                    className={`${styles.positionFilterButton} ${
                      filters.type === "all" ? styles.positionFilterButtonActive : ""
                    }`}
                    onClick={() =>
                      setPositionFilters((prev) => ({
                        ...prev,
                        [position.code]: { ...prev[position.code], type: "all" },
                      }))
                    }
                  >
                    {t.shared.materialFilters.all} · {totalItems.length}
                  </button>
                  <button
                    type="button"
                    className={`${styles.positionFilterButton} ${
                      filters.type === "REQ" ? styles.positionFilterButtonActive : ""
                    }`}
                    onClick={() =>
                      setPositionFilters((prev) => ({
                        ...prev,
                        [position.code]: { ...prev[position.code], type: "REQ" },
                      }))
                    }
                  >
                    {t.shared.materialFilters.req} · {requiredCount}
                  </button>
                  {MATERIAL_FILTER_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.positionFilterButton} ${
                        filters.type === type ? styles.positionFilterButtonActive : ""
                      }`}
                      onClick={() =>
                        setPositionFilters((prev) => ({
                          ...prev,
                          [position.code]: { ...prev[position.code], type },
                        }))
                      }
                    >
                      {t.shared.materialFilters[type]}
                    </button>
                  ))}
                  <input
                    type="search"
                    className={styles.positionSearch}
                    value={filters.q}
                    placeholder={`${t.shared.materialSearchPrefix}${getTrainingPositionLabel(position, "zh")}${t.shared.materialSearchSuffix}`}
                    onChange={(event) =>
                      setPositionFilters((prev) => ({
                        ...prev,
                        [position.code]: { ...prev[position.code], q: event.target.value },
                      }))
                    }
                  />
                </div>

                <div className={styles.materialList}>
                  {isLoadingMaterials ? (
                    <div className={styles.materialEmpty}>正在加载培训资料...</div>
                  ) : visibleItems.length > 0 ? (
                    visibleItems.map((item, itemIndex) => {
                      const isEditing = editingMaterialId === item.materialId;
                      const isSaving = savingMaterialId === item.materialId;
                      const isDeleting = deletingMaterialId === item.materialId;

                      return (
                      <div key={item.id} className={styles.materialRow}>
                        <div className={styles.materialIndex}>
                          {String(itemIndex + 1).padStart(2, "0")}
                        </div>
                        <div
                          className={`${styles.materialTypeIcon} ${
                            styles[`materialTypeIcon${item.type}`] ||
                            styles.materialTypeIconOTHER
                          }`}
                        >
                          {item.type.slice(0, 3)}
                        </div>
                        <div className={styles.materialTitleWrap}>
                          {isEditing ? (
                            <div className={styles.materialRenameForm}>
                              <input
                                value={editingForm.title}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    title: event.target.value,
                                  }))
                                }
                                aria-label="资料标题"
                                placeholder="标题"
                              />
                              <select
                                value={editingForm.positionId}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    positionId: event.target.value,
                                  }))
                                }
                                aria-label="岗位"
                              >
                                {activePositionOptions.map((option) => (
                                  <option key={option.code} value={option.code}>
                                    {getTrainingPositionLabel(option, "zh")}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={editingForm.type}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    type: event.target.value,
                                  }))
                                }
                                aria-label="类型"
                              >
                                {MATERIAL_FILTER_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                              <label className={styles.materialEditToggle}>
                                <input
                                  type="checkbox"
                                  checked={editingForm.isRequired}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({
                                      ...prev,
                                      isRequired: event.target.checked,
                                    }))
                                  }
                                />
                                必修
                              </label>
                              <textarea
                                value={editingForm.description}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    description: event.target.value,
                                  }))
                                }
                                aria-label="资料描述"
                                placeholder="描述"
                              />
                              <button
                                type="button"
                                onClick={() => saveMaterial(item.materialId)}
                                disabled={isSaving}
                              >
                                {isSaving ? "保存中" : "保存"}
                              </button>
                              <button type="button" onClick={cancelEditingMaterial}>
                                取消
                              </button>
                            </div>
                          ) : (
                            <b>
                              {item.title}
                              {item.req ? <span className={styles.materialReqTag}>REQ</span> : null}
                              {canUpdateMaterials ? (
                                <button
                                  type="button"
                                  className={styles.materialRenameButton}
                                  onClick={() => startEditingMaterial(item)}
                                >
                                  编辑
                                </button>
                              ) : null}
                              {canUpdateMaterials ? (
                                <button
                                  type="button"
                                  className={styles.materialRenameButton}
                                  onClick={() =>
                                    setQuizMaterial({
                                      id: item.materialId,
                                      title: item.title,
                                    })
                                  }
                                >
                                  测验
                                </button>
                              ) : null}
                              {canDeleteMaterials ? (
                                <button
                                  type="button"
                                  className={styles.materialDeleteButton}
                                  onClick={() => deleteMaterial(item.materialId)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? "删除中" : "删除"}
                                </button>
                              ) : null}
                            </b>
                          )}
                          <div className={styles.materialSub}>
                            {item.pos} · {item.type} · {item.raw.mimeType || "FILE"} · {item.sub}
                          </div>
                        </div>
                        <div className={styles.materialCode}>{item.id}</div>
                        <div className={styles.materialUpdated}>UPD · {item.upd}</div>
                        <div className={styles.materialSize}>{item.size}</div>
                        {item.materialId ? (
                          <Link
                            href={`/dashboard/training/materials/player?id=${item.materialId}`}
                            className={styles.materialArrow}
                          >
                            播放
                          </Link>
                        ) : (
                          <div className={styles.materialArrow}>播放</div>
                        )}
                      </div>
                      );
                    })
                  ) : (
                    <div className={styles.materialEmpty}>
                      {materialsError
                        ? "资料加载失败，请稍后重试。"
                        : hasActiveFilters
                          ? "当前筛选无资料"
                          : "暂无资料"}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
          {quizMaterial ? (
            <QuizManagerModal
              materialId={quizMaterial.id}
              materialTitle={quizMaterial.title}
              onClose={() => setQuizMaterial(null)}
            />
          ) : null}
        </>
      )}
    </TrainingLayout>
  );
}
