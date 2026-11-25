"use client";

import { useState } from "react";
import type { ExamDifficultyCounts } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import type { ExamMaterialCopy } from "../constants/exam-material-copy";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import {
  DIFFICULTY_PROFILES,
  DIFFICULTY_PROFILE_KEYS,
  EXAM_DIFFICULTIES,
  emptyDifficultyCounts,
  splitByRatio,
  sumCounts,
  toCount,
} from "../utils/difficultyTargets";

type DifficultyTargetsInputProps = {
  value: ExamDifficultyCounts | null;
  copy: ExamBankCopy;
  labels: ExamMaterialCopy["targets"];
  onChange: (value: ExamDifficultyCounts | null) => void;
};

/**
 * Per-difficulty bank targets. A total plus a profile preset (5:3:2, 4:3:3,
 * 2:3:5) fills the three numbers; they stay editable. Clearing sets null.
 */
export default function DifficultyTargetsInput({
  value,
  copy,
  labels,
  onChange,
}: DifficultyTargetsInputProps) {
  const [total, setTotal] = useState(() => (value ? String(sumCounts(value)) : ""));
  const counts = value ?? emptyDifficultyCounts();

  return (
    <fieldset className={planStyles.fieldset}>
      <legend className={styles.field}>{labels.title}</legend>
      <p className={styles.muted}>{labels.hint}</p>
      <div className={styles.actions}>
        <label className={`${styles.field} ${planStyles.narrowField}`}>
          {labels.total}
          <input
            type="number"
            min={0}
            max={1000}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </label>
        {DIFFICULTY_PROFILE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.button}
            disabled={toCount(total) === 0}
            onClick={() => onChange(splitByRatio(toCount(total), DIFFICULTY_PROFILES[key]))}
          >
            {labels.profiles[key]}
          </button>
        ))}
      </div>
      <div className={styles.actions} style={{ marginTop: 12 }}>
        {EXAM_DIFFICULTIES.map((d) => (
          <label key={d} className={`${styles.field} ${planStyles.narrowField}`}>
            {copy.difficulties[d]}
            <input
              type="number"
              min={0}
              max={1000}
              value={value ? counts[d] : ""}
              onChange={(e) => onChange({ ...counts, [d]: toCount(e.target.value) })}
            />
          </label>
        ))}
        <span className={styles.muted}>{value ? labels.sum(sumCounts(value)) : labels.none}</span>
        <button
          type="button"
          className={styles.button}
          disabled={value === null}
          onClick={() => {
            setTotal("");
            onChange(null);
          }}
        >
          {labels.clear}
        </button>
      </div>
    </fieldset>
  );
}
