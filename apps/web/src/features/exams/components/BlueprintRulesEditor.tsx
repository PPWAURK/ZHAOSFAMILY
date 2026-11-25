import type { ExamBlueprint, ExamCategory } from "@zhao/types";

import type { ExamBlueprintCopy } from "../constants/exam-blueprint-copy";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import { toCount } from "../utils/difficultyTargets";
import { UNSET_ID, addRule, removeRule, updateRule } from "../utils/examBlueprint";

type BlueprintRulesEditorProps = {
  blueprint: ExamBlueprint;
  categories: readonly ExamCategory[];
  labels: ExamBlueprintCopy;
  onChange: (blueprint: ExamBlueprint) => void;
};

/** Veto rules: more than `maxWrong` wrong answers in the category fails the paper. */
export default function BlueprintRulesEditor({
  blueprint,
  categories,
  labels,
  onChange,
}: BlueprintRulesEditorProps) {
  return (
    <fieldset className={planStyles.sectionBox}>
      <legend className={planStyles.sectionLegend}>{labels.rules}</legend>
      <p className={styles.muted}>{labels.rulesHint}</p>
      {blueprint.rules.map((rule, ruleIndex) => {
        const taken = new Set(
          blueprint.rules.filter((_, i) => i !== ruleIndex).map((r) => r.categoryId),
        );
        return (
          <div key={ruleIndex} className={styles.actions} style={{ marginBottom: 8 }}>
            <label className={styles.field}>
              {labels.ruleCategory}
              <select
                value={rule.categoryId}
                onChange={(e) =>
                  onChange(updateRule(blueprint, ruleIndex, { categoryId: Number(e.target.value) }))
                }
              >
                <option value={UNSET_ID}>{labels.chooseCategory}</option>
                {categories
                  .filter((c) => c.id === rule.categoryId || !taken.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameZh} / {c.nameFr}
                    </option>
                  ))}
              </select>
            </label>
            <label className={`${styles.field} ${planStyles.narrowField}`}>
              {labels.ruleMaxWrong}
              <input
                type="number"
                min={0}
                max={200}
                value={rule.maxWrong}
                onChange={(e) =>
                  onChange(updateRule(blueprint, ruleIndex, { maxWrong: toCount(e.target.value) }))
                }
              />
            </label>
            <button
              type="button"
              className={planStyles.linkDanger}
              onClick={() => onChange(removeRule(blueprint, ruleIndex))}
            >
              {labels.removeRule}
            </button>
          </div>
        );
      })}
      <button type="button" className={styles.button} onClick={() => onChange(addRule(blueprint))}>
        {labels.addRule}
      </button>
    </fieldset>
  );
}
