"use client";

import { useState, type FormEvent } from "react";
import type { ExamCategory } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { uploadKnowledgeMaterial } from "../services/knowledgeBaseApi";
import CategorySelect from "./CategorySelect";

const ACCEPT = ".pdf,.docx,.txt,application/pdf,text/plain";

type KnowledgeUploadFormProps = {
  copy: ExamBankCopy;
  lang: ExamUiLanguage;
  categories: readonly ExamCategory[];
  noCategoryLabel: string;
  onUploaded: () => void;
};

/**
 * Uploads one or many files in a row. Each material is titled after its file
 * name by the server; the category and description apply to every file.
 */
export default function KnowledgeUploadForm({
  copy,
  lang,
  categories,
  noCategoryLabel,
  onUploaded,
}: KnowledgeUploadFormProps) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const isUploading = doneCount !== null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!files.length) return;
    setErrors([]);
    const failures: string[] = [];
    for (const [index, file] of files.entries()) {
      setDoneCount(index);
      try {
        await uploadKnowledgeMaterial({
          file,
          description: description.trim() || undefined,
          categoryId: categoryId ?? undefined,
        });
      } catch (reason) {
        failures.push(`${file.name}: ${describeExamError(reason, lang)}`);
      }
    }
    setDoneCount(null);
    setErrors(failures);
    setFiles([]);
    form.reset();
    onUploaded();
  };

  return (
    <form className={styles.panel} onSubmit={(event) => void submit(event)}>
      <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>
        {copy.knowledge.uploadTitle}
      </h2>
      <p className={styles.muted}>{copy.knowledge.fileHint}</p>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          {copy.knowledge.fieldFile}
          <input
            type="file"
            accept={ACCEPT}
            multiple
            required
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <CategorySelect
          label={copy.knowledge.fieldCategory}
          emptyLabel={noCategoryLabel}
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
        />
        <label className={styles.field}>
          {copy.knowledge.fieldDescription}
          <input
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className={styles.buttonPrimary}
          disabled={isUploading || !files.length}
        >
          {isUploading
            ? copy.knowledge.uploadProgress(doneCount + 1, files.length)
            : copy.knowledge.upload}
        </button>
      </div>
      {files.length > 1 && !isUploading ? (
        <p className={styles.muted}>{copy.knowledge.filesSelected(files.length)}</p>
      ) : null}
      {errors.map((message) => (
        <p key={message} className={styles.error}>
          {message}
        </p>
      ))}
    </form>
  );
}
