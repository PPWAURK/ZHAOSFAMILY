"use client";

import { useState } from "react";
import type {
  ExamCategory,
  ExamDifficultyCounts,
  KnowledgeMaterial,
  UpdateKnowledgeMaterialInput,
} from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import type { ExamMaterialCopy } from "../constants/exam-material-copy";
import styles from "../exams.module.css";
import CategorySelect from "./CategorySelect";
import DifficultyTargetsInput from "./DifficultyTargetsInput";

type MaterialEditorModalProps = {
  material: KnowledgeMaterial;
  categories: ExamCategory[];
  copy: ExamBankCopy;
  labels: ExamMaterialCopy;
  error: string | null;
  isSaving: boolean;
  onSave: (input: UpdateKnowledgeMaterialInput) => void;
  onClose: () => void;
};

/** Title, category and per-difficulty bank targets of one knowledge material. */
export default function MaterialEditorModal({
  material,
  categories,
  copy,
  labels,
  error,
  isSaving,
  onSave,
  onClose,
}: MaterialEditorModalProps) {
  const [title, setTitle] = useState(material.title);
  const [categoryId, setCategoryId] = useState<number | null>(material.categoryId);
  const [targets, setTargets] = useState<ExamDifficultyCounts | null>(material.targets);

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={labels.editor.title}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSaving) onClose();
      }}
    >
      <form
        className={styles.modal}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ title: title.trim(), categoryId, targets });
        }}
      >
        <h2>{labels.editor.title}</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            {labels.editor.fieldTitle}
            <input
              value={title}
              maxLength={200}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <CategorySelect
            label={labels.editor.category}
            emptyLabel={labels.editor.noCategory}
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>
        <DifficultyTargetsInput
          value={targets}
          copy={copy}
          labels={labels.targets}
          onChange={setTargets}
        />
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions} style={{ marginTop: 16 }}>
          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={isSaving || !title.trim()}
          >
            {copy.save}
          </button>
          <button type="button" className={styles.button} disabled={isSaving} onClick={onClose}>
            {copy.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
