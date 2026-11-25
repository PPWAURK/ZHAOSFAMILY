"use client";

import { useMemo, useState } from "react";
import type {
  ExamBlueprint,
  ExamCategory,
  ExamTemplate,
  ExamTemplateAccessMode,
  ExamTemplateInput,
  KnowledgeMaterial,
} from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { EXAM_BLUEPRINT_COPY } from "../constants/exam-blueprint-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import { useDebouncedRequest } from "../hooks/useDebouncedRequest";
import { checkExamBlueprint, checkExamPool } from "../services/examTemplatesApi";
import { blueprintIssues, defaultBlueprint, toCheckableBlueprint } from "../utils/examBlueprint";
import {
  toPoolConfig,
  toTemplateDraft,
  toTemplateInput,
  type TemplateDraft,
  type TemplateMode,
} from "../utils/templateDraft";
import BlueprintEditor from "./BlueprintEditor";
import SimplePoolFields, { optionalInt } from "./SimplePoolFields";

type TemplateEditorModalProps = {
  template: ExamTemplate | null;
  categories: ExamCategory[];
  materials: KnowledgeMaterial[];
  copy: ExamBankCopy;
  lang: ExamUiLanguage;
  error: string | null;
  onSave: (input: ExamTemplateInput) => void;
  onClose: () => void;
};

const MODES: TemplateMode[] = ["simple", "sectioned"];

export default function TemplateEditorModal({
  template,
  categories,
  materials,
  copy,
  lang,
  error,
  onSave,
  onClose,
}: TemplateEditorModalProps) {
  const [draft, setDraft] = useState<TemplateDraft>(() => toTemplateDraft(template));
  const [mode, setMode] = useState<TemplateMode>(template?.blueprint ? "sectioned" : "simple");
  const [blueprint, setBlueprint] = useState<ExamBlueprint>(
    () => template?.blueprint ?? defaultBlueprint(),
  );
  const labels = copy.templates;
  const blueprintLabels = EXAM_BLUEPRINT_COPY[lang];
  const update = (patch: Partial<TemplateDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const isSectioned = mode === "sectioned";

  const poolConfig = toPoolConfig(draft);
  const pool = useDebouncedRequest(
    isSectioned ? null : () => checkExamPool(poolConfig),
    JSON.stringify(poolConfig),
  );
  const checkable = useMemo(
    () => (isSectioned ? toCheckableBlueprint(blueprint) : null),
    [isSectioned, blueprint],
  );
  const blueprintCheck = useDebouncedRequest(
    checkable ? () => checkExamBlueprint(checkable.blueprint) : null,
    JSON.stringify(checkable?.blueprint ?? null),
  );
  const issues = useMemo(() => blueprintIssues(blueprint), [blueprint]);

  const isInsufficient = isSectioned
    ? issues.length === 0 && blueprintCheck.data?.isSufficient === false
    : pool.data !== null && !pool.data.isSufficient;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={labels.newTemplate}
    >
      <form
        className={`${styles.modal} ${isSectioned ? planStyles.wideModal : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(toTemplateInput(draft, mode, blueprint));
        }}
      >
        <h2>{template ? `${template.titleZh} / ${template.titleFr}` : labels.newTemplate}</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            {labels.titleZh}
            <input
              value={draft.titleZh}
              maxLength={200}
              required
              onChange={(e) => update({ titleZh: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            {labels.titleFr}
            <input
              value={draft.titleFr}
              maxLength={200}
              required
              onChange={(e) => update({ titleFr: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            {labels.descriptionZh}
            <textarea
              value={draft.descriptionZh ?? ""}
              onChange={(e) => update({ descriptionZh: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            {labels.descriptionFr}
            <textarea
              value={draft.descriptionFr ?? ""}
              onChange={(e) => update({ descriptionFr: e.target.value })}
            />
          </label>
        </div>

        <div className={styles.formGrid} style={{ marginTop: 16 }}>
          <label className={styles.field}>
            {labels.passingScore}
            <input
              type="number"
              min={0}
              max={100}
              value={draft.passingScore}
              onChange={(e) => update({ passingScore: Number(e.target.value) })}
            />
          </label>
          <label className={styles.field}>
            {labels.maxAttempts}
            <input
              type="number"
              min={1}
              max={100}
              value={draft.maxAttempts ?? ""}
              onChange={(e) => update({ maxAttempts: optionalInt(e.target.value) })}
            />
          </label>
          <label className={styles.field}>
            {labels.accessMode}
            <select
              value={draft.accessMode}
              onChange={(e) => update({ accessMode: e.target.value as ExamTemplateAccessMode })}
            >
              <option value="LIST">{labels.accessModes.LIST}</option>
              <option value="CODE">{labels.accessModes.CODE}</option>
            </select>
          </label>
        </div>
        {draft.accessMode === "CODE" ? (
          <p className={styles.notice}>{labels.accessModeHint}</p>
        ) : null}

        <div className={planStyles.modeSwitch} role="radiogroup" aria-label={blueprintLabels.mode}>
          <span className={styles.field}>{blueprintLabels.mode}</span>
          {MODES.map((option) => (
            <label key={option} className={styles.checkboxRow}>
              <input
                type="radio"
                name="template-mode"
                value={option}
                checked={mode === option}
                onChange={() => setMode(option)}
              />
              {blueprintLabels.modes[option]}
            </label>
          ))}
        </div>
        {isSectioned ? (
          <>
            <p className={styles.muted}>{blueprintLabels.modeHint}</p>
            <BlueprintEditor
              blueprint={blueprint}
              issues={issues}
              check={blueprintCheck}
              checkedSections={checkable?.sectionIndexes ?? null}
              categories={categories}
              materials={materials}
              copy={copy}
              labels={blueprintLabels}
              lang={lang}
              onChange={setBlueprint}
            />
          </>
        ) : (
          <SimplePoolFields
            draft={draft}
            categories={categories}
            materials={materials}
            copy={copy}
            pool={pool.data}
            onChange={update}
          />
        )}

        <div className={styles.actions} style={{ margin: "16px 0" }}>
          {(["shuffleOptions", "showExplanations", "isActive"] as const).map((flag) => (
            <label key={flag} className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={draft[flag]}
                onChange={(e) => update({ [flag]: e.target.checked })}
              />
              {labels[flag]}
            </label>
          ))}
        </div>
        {isSectioned && draft.isActive && isInsufficient ? (
          <p className={styles.error}>{labels.insufficient}</p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={draft.isActive && isInsufficient}
          >
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
