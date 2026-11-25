import type {
  ExamBlueprint,
  ExamBlueprintCheck,
  ExamCategory,
  KnowledgeMaterial,
} from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import type { ExamBlueprintCopy } from "../constants/exam-blueprint-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import type { DebouncedRequest } from "../hooks/useDebouncedRequest";
import { toCount } from "../utils/difficultyTargets";
import {
  MAX_BLUEPRINT_SECTIONS,
  MAX_BREAK_MINUTES,
  addSection,
  blueprintSummary,
  findSectionCheck,
  removeSection,
} from "../utils/examBlueprint";
import BlueprintRulesEditor from "./BlueprintRulesEditor";
import BlueprintSectionEditor from "./BlueprintSectionEditor";

type BlueprintEditorProps = {
  blueprint: ExamBlueprint;
  issues: readonly string[];
  check: DebouncedRequest<ExamBlueprintCheck>;
  /** Original section index of each section sent to the check; null when nothing is checkable. */
  checkedSections: readonly number[] | null;
  categories: readonly ExamCategory[];
  materials: readonly KnowledgeMaterial[];
  copy: ExamBankCopy;
  labels: ExamBlueprintCopy;
  lang: ExamUiLanguage;
  onChange: (blueprint: ExamBlueprint) => void;
};

function CheckStatus({
  issues,
  check,
  checkedSections,
  labels,
  lang,
}: Pick<BlueprintEditorProps, "issues" | "check" | "checkedSections" | "labels" | "lang">) {
  if (issues.length) {
    return (
      <div className={styles.error} role="status">
        {labels.fixFirst}
        <ul className={planStyles.issueList}>
          {issues.map((code) => (
            <li key={code}>{describeExamError(new Error(code), lang)}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (!checkedSections) return <p className={styles.muted}>{labels.checkPending}</p>;
  if (check.isPending) return <p className={styles.muted}>{labels.checking}</p>;
  if (check.error) {
    return (
      <p className={styles.error}>
        {labels.checkFailed} {describeExamError(check.error, lang)}
      </p>
    );
  }
  if (!check.data) return null;
  return (
    <p className={check.data.isSufficient ? styles.notice : styles.error} role="status">
      {check.data.isSufficient ? labels.sufficient : labels.insufficient}
    </p>
  );
}

/** Sectioned paper (分场组卷): break, sections with their file rows, veto rules, live bank check. */
export default function BlueprintEditor(props: BlueprintEditorProps) {
  const { blueprint, check, checkedSections, categories, materials, copy, labels, onChange } =
    props;
  const summary = blueprintSummary(blueprint);
  const canRemove = blueprint.sections.length > 1;

  return (
    <div className={planStyles.blueprint}>
      <div className={styles.actions}>
        <label className={`${styles.field} ${planStyles.narrowField}`}>
          {labels.breakMinutes}
          <input
            type="number"
            min={0}
            max={MAX_BREAK_MINUTES}
            value={blueprint.breakMinutes}
            onChange={(e) => onChange({ ...blueprint, breakMinutes: toCount(e.target.value) })}
          />
        </label>
        <strong>
          {labels.summary(
            blueprint.sections.length,
            summary.questionCount,
            summary.timeLimitMinutes,
          )}
        </strong>
      </div>
      {blueprint.sections.map((_, index) => (
        <BlueprintSectionEditor
          key={index}
          blueprint={blueprint}
          index={index}
          materials={materials}
          check={findSectionCheck(check.data, checkedSections ?? [], index)}
          copy={copy}
          labels={labels}
          onChange={onChange}
          onRemove={canRemove ? () => onChange(removeSection(blueprint, index)) : undefined}
        />
      ))}
      {blueprint.sections.length < MAX_BLUEPRINT_SECTIONS ? (
        <button
          type="button"
          className={styles.button}
          onClick={() => onChange(addSection(blueprint))}
        >
          {labels.addSection}
        </button>
      ) : null}
      <BlueprintRulesEditor
        blueprint={blueprint}
        categories={categories}
        labels={labels}
        onChange={onChange}
      />
      <CheckStatus {...props} />
    </div>
  );
}
