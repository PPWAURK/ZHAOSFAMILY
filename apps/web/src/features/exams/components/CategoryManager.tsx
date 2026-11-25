"use client";

import { useState, type FormEvent } from "react";
import type { ExamCategory } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { createExamCategory, deleteExamCategory } from "../services/examQuestionsApi";

type CategoryManagerProps = {
  categories: ExamCategory[];
  copy: ExamBankCopy;
  lang: ExamUiLanguage;
  onChanged: () => void;
};

/** Categories steer AI generation (the model picks one per question) and template filters. */
export default function CategoryManager({
  categories,
  copy,
  lang,
  onChanged,
}: CategoryManagerProps) {
  const [code, setCode] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (reason) {
      setError(describeExamError(reason, lang));
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createExamCategory({ code: code.trim(), nameZh: nameZh.trim(), nameFr: nameFr.trim() });
      setCode("");
      setNameZh("");
      setNameFr("");
    });
  };

  return (
    <details className={styles.panel}>
      <summary>
        {copy.review.categories} ({categories.length})
      </summary>
      <ul>
        {categories.map((category) => (
          <li key={category.id} className={styles.checkboxRow}>
            <code>{category.code}</code> {category.nameZh} / {category.nameFr}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => void run(() => deleteExamCategory(category.id))}
            >
              {copy.delete}
            </button>
          </li>
        ))}
      </ul>
      <form className={styles.formGrid} onSubmit={submit}>
        <label className={styles.field}>
          {copy.review.categoryCode}
          <input
            value={code}
            pattern="[a-z0-9_-]{1,40}"
            required
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {copy.review.categoryNameZh}
          <input
            value={nameZh}
            maxLength={100}
            required
            onChange={(e) => setNameZh(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {copy.review.categoryNameFr}
          <input
            value={nameFr}
            maxLength={100}
            required
            onChange={(e) => setNameFr(e.target.value)}
          />
        </label>
        <button type="submit" className={styles.button}>
          {copy.review.addCategory}
        </button>
      </form>
      {error ? <p className={styles.error}>{error}</p> : null}
    </details>
  );
}
