"use client";

import { useState } from "react";
import type { ExamCategory, KnowledgeMaterial, UpdateKnowledgeMaterialInput } from "@zhao/types";

import ChunkPreviewModal from "../components/ChunkPreviewModal";
import ExamBankLayout from "../components/ExamBankLayout";
import CategoryManager from "../components/CategoryManager";
import KnowledgeUploadForm from "../components/KnowledgeUploadForm";
import MaterialEditorModal from "../components/MaterialEditorModal";
import StatusBadge from "../components/StatusBadge";
import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import { EXAM_MATERIAL_COPY, type ExamMaterialCopy } from "../constants/exam-material-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useConfirmAction } from "../hooks/useConfirmAction";
import { useInterval } from "../hooks/useInterval";
import { fetchExamCategories } from "../services/examQuestionsApi";
import {
  deleteKnowledgeMaterial,
  fetchKnowledgeMaterials,
  reprocessKnowledgeMaterial,
  updateKnowledgeMaterial,
} from "../services/knowledgeBaseApi";
import { formatDifficultyCounts, sumCounts } from "../utils/difficultyTargets";
import { categoryName, formatBytes, formatDateTime } from "../utils/examFormat";

const POLL_MS = 10_000;

function statusDetail(material: KnowledgeMaterial, copy: ExamBankCopy): string | null {
  if (material.status !== "FAILED") return null;
  return material.errorCode === "KB_MATERIAL_NO_TEXT"
    ? copy.knowledge.noText
    : copy.knowledge.failed;
}

type MaterialRowProps = {
  material: KnowledgeMaterial;
  categories: readonly ExamCategory[];
  copy: ExamBankCopy;
  labels: ExamMaterialCopy;
  lang: ExamUiLanguage;
  onPreview: () => void;
  onEdit: () => void;
  onReprocess: () => void;
  onDelete: () => void;
};

function MaterialRow({ material, categories, copy, labels, lang, ...on }: MaterialRowProps) {
  const detail = statusDetail(material, copy);
  return (
    <tr>
      <td>
        <strong>{material.title}</strong>
        <br />
        <span className={styles.muted}>
          {material.originalName} · {formatDateTime(material.createdAt, lang)}
        </span>
      </td>
      <td>{categoryName(material.categoryId, categories, labels.editor.noCategory)}</td>
      <td>
        {material.targets ? (
          <>
            {formatDifficultyCounts(material.targets)}
            <br />
            <span className={styles.muted}>{labels.targets.sum(sumCounts(material.targets))}</span>
          </>
        ) : (
          <span className={styles.muted}>{labels.targets.none}</span>
        )}
      </td>
      <td>
        <StatusBadge status={material.status} label={copy.materialStatuses[material.status]} />
        {detail ? <p className={styles.muted}>{detail}</p> : null}
      </td>
      <td>{material.language ?? "—"}</td>
      <td>{material.chunkCount}</td>
      <td>{formatBytes(material.sizeBytes)}</td>
      <td>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={on.onEdit}>
            {copy.edit}
          </button>
          {material.status === "READY" ? (
            <button type="button" className={styles.button} onClick={on.onPreview}>
              {copy.knowledge.preview}
            </button>
          ) : null}
          {material.status === "READY" || material.status === "FAILED" ? (
            <button type="button" className={styles.button} onClick={on.onReprocess}>
              {copy.knowledge.reprocess}
            </button>
          ) : null}
          <button type="button" className={styles.buttonDanger} onClick={on.onDelete}>
            {copy.delete}
          </button>
        </div>
      </td>
    </tr>
  );
}

function KnowledgeContent({ copy, lang }: { copy: ExamBankCopy; lang: ExamUiLanguage }) {
  const confirm = useConfirmAction();
  const labels = EXAM_MATERIAL_COPY[lang];
  const materials = useAsyncData(fetchKnowledgeMaterials, []);
  const categories = useAsyncData(fetchExamCategories, []);
  const [preview, setPreview] = useState<KnowledgeMaterial | null>(null);
  const [editing, setEditing] = useState<KnowledgeMaterial | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isProcessing =
    materials.data?.some((m) => m.status === "PENDING" || m.status === "PROCESSING") ?? false;
  useInterval(materials.reload, isProcessing ? POLL_MS : null);

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      materials.reload();
    } catch (reason) {
      setActionError(describeExamError(reason, lang));
    }
  };
  const remove = async (material: KnowledgeMaterial) => {
    if (await confirm({ message: `${material.title}: ${copy.confirmDelete}`, tone: "danger" })) {
      await run(() => deleteKnowledgeMaterial(material.id));
    }
  };
  const save = async (input: UpdateKnowledgeMaterialInput) => {
    if (!editing) return;
    setIsSaving(true);
    setEditorError(null);
    try {
      await updateKnowledgeMaterial(editing.id, input);
      setEditing(null);
      materials.reload();
    } catch (reason) {
      setEditorError(describeExamError(reason, lang));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <CategoryManager
        categories={categories.data ?? []}
        copy={copy}
        lang={lang}
        onChanged={categories.reload}
      />
      <KnowledgeUploadForm
        copy={copy}
        lang={lang}
        categories={categories.data ?? []}
        noCategoryLabel={labels.editor.noCategory}
        onUploaded={materials.reload}
      />
      {actionError ? <p className={styles.error}>{actionError}</p> : null}
      {materials.isLoading && !materials.data ? (
        <p className={styles.muted}>{copy.loading}</p>
      ) : null}
      {materials.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {materials.data?.length === 0 ? <p className={styles.muted}>{copy.empty}</p> : null}
      {materials.data?.length ? (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {Object.values(copy.knowledge.columns).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.data.map((material) => (
                <MaterialRow
                  key={material.id}
                  material={material}
                  categories={categories.data ?? []}
                  copy={copy}
                  labels={labels}
                  lang={lang}
                  onPreview={() => setPreview(material)}
                  onEdit={() => {
                    setEditorError(null);
                    setEditing(material);
                  }}
                  onReprocess={() => void run(() => reprocessKnowledgeMaterial(material.id))}
                  onDelete={() => void remove(material)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {preview ? (
        <ChunkPreviewModal
          materialId={preview.id}
          title={preview.title}
          copy={copy}
          onClose={() => setPreview(null)}
        />
      ) : null}
      {editing ? (
        <MaterialEditorModal
          material={editing}
          categories={categories.data ?? []}
          copy={copy}
          labels={labels}
          error={editorError}
          isSaving={isSaving}
          onSave={(input) => void save(input)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

export default function KnowledgeBasePage() {
  return (
    <ExamBankLayout active="knowledge" subtitle={(copy) => copy.knowledge.subtitle}>
      {({ copy, lang }) => <KnowledgeContent copy={copy} lang={lang} />}
    </ExamBankLayout>
  );
}
