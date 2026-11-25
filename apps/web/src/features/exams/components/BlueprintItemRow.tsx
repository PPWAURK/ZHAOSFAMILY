import type { ExamBlueprintItem, KnowledgeMaterial } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import type { ExamBlueprintCopy } from "../constants/exam-blueprint-copy";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import {
  DIFFICULTY_PROFILES,
  EXAM_DIFFICULTIES,
  splitByRatio,
  sumCounts,
  toCount,
} from "../utils/difficultyTargets";
import { UNSET_ID, isItemSplitValid, type ItemCheck } from "../utils/examBlueprint";

type BlueprintItemRowProps = {
  item: ExamBlueprintItem;
  /** Ready materials; the ones used in another row are left out. */
  materials: readonly KnowledgeMaterial[];
  usedElsewhere: ReadonlySet<number>;
  check: ItemCheck | null;
  copy: ExamBankCopy;
  labels: ExamBlueprintCopy;
  onChange: (patch: Partial<ExamBlueprintItem>) => void;
  onRemove: () => void;
};

function AvailabilityCell({
  check,
  copy,
  labels,
}: Pick<BlueprintItemRowProps, "check" | "copy" | "labels">) {
  if (!check) return <td className={styles.muted}>—</td>;
  return (
    <td>
      {check.cells.map((cell) => (
        <span
          key={cell.difficulty ?? "any"}
          className={cell.available < cell.required ? planStyles.cellAlert : planStyles.cellOk}
        >
          {cell.difficulty ? copy.difficulties[cell.difficulty] : labels.anyDifficulty}{" "}
          {cell.required}/{cell.available}
        </span>
      ))}
    </td>
  );
}

/** One file of a section: material, question count, optional fixed difficulty split. */
export default function BlueprintItemRow({
  item,
  materials,
  usedElsewhere,
  check,
  copy,
  labels,
  onChange,
  onRemove,
}: BlueprintItemRowProps) {
  const options = materials.filter((m) => m.id === item.materialId || !usedElsewhere.has(m.id));
  const isKnown = item.materialId === UNSET_ID || options.some((m) => m.id === item.materialId);
  const split = item.difficulty;
  const isSplitValid = isItemSplitValid(item);

  return (
    <tr>
      <td>
        <select
          className={planStyles.compactInput}
          aria-label={labels.columns.material}
          value={item.materialId}
          onChange={(e) => onChange({ materialId: Number(e.target.value) })}
        >
          <option value={UNSET_ID}>{labels.chooseMaterial}</option>
          {isKnown ? null : (
            <option value={item.materialId}>{labels.unknownMaterial(item.materialId)}</option>
          )}
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          min={1}
          max={200}
          className={planStyles.numberInput}
          aria-label={labels.columns.count}
          value={item.count}
          onChange={(e) => onChange({ count: toCount(e.target.value) })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={labels.columns.split}
          checked={split !== null}
          onChange={(e) =>
            onChange({
              difficulty: e.target.checked
                ? splitByRatio(item.count, DIFFICULTY_PROFILES.balanced)
                : null,
            })
          }
        />
      </td>
      {EXAM_DIFFICULTIES.map((d) => (
        <td key={d}>
          <input
            type="number"
            min={0}
            max={200}
            className={planStyles.numberInput}
            aria-label={copy.difficulties[d]}
            disabled={split === null}
            value={split ? split[d] : ""}
            onChange={(e) =>
              split && onChange({ difficulty: { ...split, [d]: toCount(e.target.value) } })
            }
          />
        </td>
      ))}
      <td className={isSplitValid ? styles.muted : planStyles.cellAlert} data-testid="split-sum">
        {split ? labels.splitSum(sumCounts(split), item.count) : "—"}
      </td>
      <AvailabilityCell check={check} copy={copy} labels={labels} />
      <td>
        <button type="button" className={planStyles.linkDanger} onClick={onRemove}>
          {labels.removeItem}
        </button>
      </td>
    </tr>
  );
}
