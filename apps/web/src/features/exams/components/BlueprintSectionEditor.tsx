import type { ExamBlueprint, ExamBlueprintSection, KnowledgeMaterial } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import type { ExamBlueprintCopy } from "../constants/exam-blueprint-copy";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import { toCount } from "../utils/difficultyTargets";
import {
  addItem,
  findItemCheck,
  materialsUsedElsewhere,
  removeItem,
  sectionItemTotal,
  sectionTypeTotal,
  updateItem,
  updateSection,
  type SectionCheck,
} from "../utils/examBlueprint";
import BlueprintItemRow from "./BlueprintItemRow";
import { optionalInt } from "./SimplePoolFields";

const TYPES = ["single", "multiple", "boolean"] as const;

type BlueprintSectionEditorProps = {
  blueprint: ExamBlueprint;
  index: number;
  materials: readonly KnowledgeMaterial[];
  check: SectionCheck | null;
  copy: ExamBankCopy;
  labels: ExamBlueprintCopy;
  onChange: (blueprint: ExamBlueprint) => void;
  /** Absent when this is the only section. */
  onRemove?: () => void;
};

function TypeCountsRow({
  section,
  copy,
  labels,
  onChange,
}: {
  section: ExamBlueprintSection;
  copy: ExamBankCopy;
  labels: ExamBlueprintCopy;
  onChange: (patch: Partial<ExamBlueprintSection>) => void;
}) {
  const types = sectionTypeTotal(section);
  const items = sectionItemTotal(section);
  const isBalanced = types === items;
  return (
    <div className={styles.actions}>
      {TYPES.map((type) => (
        <label key={type} className={`${styles.field} ${planStyles.narrowField}`}>
          {copy.types[type]}
          <input
            type="number"
            min={0}
            max={200}
            value={section.typeCounts[type]}
            onChange={(e) =>
              onChange({ typeCounts: { ...section.typeCounts, [type]: toCount(e.target.value) } })
            }
          />
        </label>
      ))}
      <span
        className={isBalanced ? planStyles.sumOk : planStyles.sumBad}
        role="status"
        data-testid="type-sum"
      >
        {labels.typeSum(types, items)} · {isBalanced ? labels.typeMatch : labels.typeMismatch}
      </span>
    </div>
  );
}

/** One part of a sectioned paper: titles, time limit, type totals and its file rows. */
export default function BlueprintSectionEditor({
  blueprint,
  index,
  materials,
  check,
  copy,
  labels,
  onChange,
  onRemove,
}: BlueprintSectionEditorProps) {
  const section = blueprint.sections[index];
  const patch = (value: Partial<ExamBlueprintSection>) =>
    onChange(updateSection(blueprint, index, value));
  const isTypeChecked = sectionTypeTotal(section) === sectionItemTotal(section);

  return (
    <fieldset className={planStyles.sectionBox}>
      <legend className={planStyles.sectionLegend}>
        {labels.section(index + 1)}
        {onRemove ? (
          <button type="button" className={planStyles.linkDanger} onClick={onRemove}>
            {labels.removeSection}
          </button>
        ) : null}
      </legend>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          {labels.sectionTitleZh}
          <input
            value={section.titleZh}
            maxLength={100}
            onChange={(e) => patch({ titleZh: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          {labels.sectionTitleFr}
          <input
            value={section.titleFr}
            maxLength={100}
            onChange={(e) => patch({ titleFr: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          {labels.sectionTime}
          <input
            type="number"
            min={1}
            max={600}
            value={section.timeLimitMinutes ?? ""}
            onChange={(e) => patch({ timeLimitMinutes: optionalInt(e.target.value) })}
          />
        </label>
      </div>
      <TypeCountsRow section={section} copy={copy} labels={labels} onChange={patch} />
      {check && isTypeChecked && !check.isTypeMixFeasible ? (
        <p className={styles.error}>{labels.typeInfeasible}</p>
      ) : null}
      <div className={styles.tableScroller}>
        <table className={`${styles.table} ${planStyles.compactTable}`}>
          <thead>
            <tr>
              <th>{labels.columns.material}</th>
              <th>{labels.columns.count}</th>
              <th>{labels.columns.split}</th>
              <th>{copy.difficulties.recall}</th>
              <th>{copy.difficulties.understand}</th>
              <th>{copy.difficulties.scenario}</th>
              <th aria-hidden="true" />
              <th>{labels.columns.available}</th>
              <th>{labels.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, itemIndex) => (
              <BlueprintItemRow
                key={itemIndex}
                item={item}
                materials={materials}
                usedElsewhere={materialsUsedElsewhere(blueprint, index, itemIndex)}
                check={findItemCheck(check, item.materialId)}
                copy={copy}
                labels={labels}
                onChange={(value) => onChange(updateItem(blueprint, index, itemIndex, value))}
                onRemove={() => onChange(removeItem(blueprint, index, itemIndex))}
              />
            ))}
          </tbody>
        </table>
      </div>
      {section.items.length === 0 ? <p className={styles.muted}>{labels.noItems}</p> : null}
      <div className={styles.actions} style={{ marginTop: 8 }}>
        <button
          type="button"
          className={styles.button}
          onClick={() => onChange(addItem(blueprint, index))}
        >
          {labels.addItem}
        </button>
      </div>
    </fieldset>
  );
}
