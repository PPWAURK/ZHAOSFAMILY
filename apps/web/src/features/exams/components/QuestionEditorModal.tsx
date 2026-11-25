"use client";

import { useState } from "react";
import type {
  ExamCategory,
  ExamQuestion,
  ExamQuestionDifficulty,
  ExamQuestionInput,
  ExamQuestionOption,
  ExamQuestionType,
} from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import styles from "../exams.module.css";
import { EXAM_DIFFICULTIES } from "../utils/difficultyTargets";

const CHOICE_KEYS = ["A", "B", "C", "D", "E"];
const TYPES: ExamQuestionType[] = ["single", "multiple", "boolean"];
const KNOWLEDGE_POINT_MAX = 100;

type Draft = Required<Omit<ExamQuestionInput, "categoryId">> & { categoryId: number | null };

export function optionsForType(
  type: ExamQuestionType,
  current: readonly ExamQuestionOption[],
): ExamQuestionOption[] {
  if (type === "boolean") {
    return [
      { key: "true", zh: "正确", fr: "Vrai" },
      { key: "false", zh: "错误", fr: "Faux" },
    ];
  }
  const choices = current.filter((o) => CHOICE_KEYS.includes(o.key));
  return choices.length >= 4
    ? choices
    : CHOICE_KEYS.slice(0, 4).map((key) => ({ key, zh: "", fr: "" }));
}

function toDraft(question: ExamQuestion | null): Draft {
  return {
    type: question?.type ?? "single",
    difficulty: question?.difficulty ?? "understand",
    categoryId: question?.category?.id ?? null,
    promptZh: question?.promptZh ?? "",
    promptFr: question?.promptFr ?? "",
    options: question?.options ?? optionsForType("single", []),
    correctKeys: question?.correctKeys ?? [],
    explanationZh: question?.explanationZh ?? "",
    explanationFr: question?.explanationFr ?? "",
    knowledgePoint: question?.knowledgePoint ?? "",
  };
}

type QuestionEditorModalProps = {
  question: ExamQuestion | null;
  categories: ExamCategory[];
  copy: ExamBankCopy;
  error: string | null;
  onSave: (input: ExamQuestionInput) => void;
  onClose: () => void;
};

export default function QuestionEditorModal({
  question,
  categories,
  copy,
  error,
  onSave,
  onClose,
}: QuestionEditorModalProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(question));
  const labels = copy.review.editor;
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const changeType = (type: ExamQuestionType) =>
    update({ type, options: optionsForType(type, draft.options), correctKeys: [] });
  const changeOption = (index: number, patch: Partial<ExamQuestionOption>) =>
    update({ options: draft.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) });
  const toggleCorrect = (key: string) => {
    const isOn = draft.correctKeys.includes(key);
    const next =
      draft.type === "multiple"
        ? isOn
          ? draft.correctKeys.filter((k) => k !== key)
          : [...draft.correctKeys, key]
        : [key];
    update({ correctKeys: next });
  };
  const canAddOption = draft.type !== "boolean" && draft.options.length < CHOICE_KEYS.length;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={labels.title}>
      <form
        className={styles.modal}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...draft,
            explanationZh: draft.explanationZh || null,
            explanationFr: draft.explanationFr || null,
            knowledgePoint: draft.knowledgePoint?.trim() || null,
          });
        }}
      >
        <h2>{question ? labels.title : copy.review.newQuestion}</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            {labels.type}
            <select
              value={draft.type}
              onChange={(e) => changeType(e.target.value as ExamQuestionType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {copy.types[t]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            {labels.difficulty}
            <select
              value={draft.difficulty}
              onChange={(e) => update({ difficulty: e.target.value as ExamQuestionDifficulty })}
            >
              {EXAM_DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {copy.difficulties[d]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            {labels.category}
            <select
              value={draft.categoryId ?? ""}
              onChange={(e) =>
                update({ categoryId: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameZh} / {c.nameFr}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.field} style={{ marginTop: 12 }}>
          {labels.knowledgePoint}
          <input
            value={draft.knowledgePoint ?? ""}
            maxLength={KNOWLEDGE_POINT_MAX}
            onChange={(e) => update({ knowledgePoint: e.target.value })}
          />
        </label>
        <label className={styles.field} style={{ marginTop: 12 }}>
          {labels.promptZh}
          <textarea
            value={draft.promptZh}
            maxLength={1000}
            required
            onChange={(e) => update({ promptZh: e.target.value })}
          />
        </label>
        <label className={styles.field} style={{ marginTop: 12 }}>
          {labels.promptFr}
          <textarea
            value={draft.promptFr}
            maxLength={1000}
            required
            onChange={(e) => update({ promptFr: e.target.value })}
          />
        </label>

        {draft.options.map((option, index) => (
          <div key={option.key} className={styles.formGrid} style={{ marginTop: 12 }}>
            <label className={styles.checkboxRow}>
              <input
                type={draft.type === "multiple" ? "checkbox" : "radio"}
                name="correct"
                checked={draft.correctKeys.includes(option.key)}
                onChange={() => toggleCorrect(option.key)}
              />
              {option.key} · {labels.correct}
            </label>
            <label className={styles.field}>
              {labels.optionZh}
              <input
                value={option.zh}
                required
                onChange={(e) => changeOption(index, { zh: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              {labels.optionFr}
              <input
                value={option.fr}
                required
                onChange={(e) => changeOption(index, { fr: e.target.value })}
              />
            </label>
          </div>
        ))}
        {canAddOption ? (
          <button
            type="button"
            className={styles.button}
            style={{ marginTop: 12 }}
            onClick={() =>
              update({
                options: [
                  ...draft.options,
                  { key: CHOICE_KEYS[draft.options.length], zh: "", fr: "" },
                ],
              })
            }
          >
            {labels.addOption}
          </button>
        ) : null}

        <label className={styles.field} style={{ marginTop: 12 }}>
          {labels.explanationZh}
          <textarea
            value={draft.explanationZh ?? ""}
            onChange={(e) => update({ explanationZh: e.target.value })}
          />
        </label>
        <label className={styles.field} style={{ marginTop: 12 }}>
          {labels.explanationFr}
          <textarea
            value={draft.explanationFr ?? ""}
            onChange={(e) => update({ explanationFr: e.target.value })}
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions} style={{ marginTop: 16 }}>
          <button type="submit" className={styles.buttonPrimary}>
            {copy.save}
          </button>
          <button type="button" className={styles.button} onClick={onClose}>
            {copy.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
