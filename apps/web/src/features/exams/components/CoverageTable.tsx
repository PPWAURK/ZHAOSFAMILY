import { Fragment } from "react";
import type { ExamCategory, ExamDifficultyCounts, MaterialCoverage } from "@zhao/types";

import type { ExamMaterialCopy } from "../constants/exam-material-copy";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import { formatDifficultyCounts, sumCounts } from "../utils/difficultyTargets";
import {
  coverageTotals,
  groupCoverageByCategory,
  hasMissingQuestions,
} from "../utils/materialCoverage";

type CountsCellProps = { counts: ExamDifficultyCounts | null; isAlert?: boolean };

function CountsCell({ counts, isAlert = false }: CountsCellProps) {
  if (!counts) return <td className={styles.muted}>—</td>;
  const total = sumCounts(counts);
  return (
    <td className={isAlert && total > 0 ? planStyles.cellAlert : undefined}>
      {formatDifficultyCounts(counts)}
      <span className={planStyles.cellTotal}>{total}</span>
    </td>
  );
}

type CoverageTableProps = {
  rows: readonly MaterialCoverage[];
  categories: readonly ExamCategory[];
  labels: ExamMaterialCopy["coverage"];
  selected: readonly number[];
  onToggle: (materialId: number) => void;
};

/** Targets / approved / draft / missing per material, grouped by category, with a totals row. */
export default function CoverageTable({
  rows,
  categories,
  labels,
  selected,
  onToggle,
}: CoverageTableProps) {
  const totals = coverageTotals(rows);
  const columnCount = Object.keys(labels.columns).length + 1;

  return (
    <div className={styles.tableScroller}>
      <table className={`${styles.table} ${planStyles.compactTable}`}>
        <thead>
          <tr>
            <th aria-hidden="true" />
            {Object.values(labels.columns).map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupCoverageByCategory(rows, categories).map((group) => (
            <Fragment key={group.category?.id ?? "none"}>
              <tr className={planStyles.groupRow}>
                <th colSpan={columnCount}>
                  {group.category
                    ? `${group.category.nameZh} / ${group.category.nameFr}`
                    : labels.uncategorized}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.materialId}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={row.title}
                      checked={selected.includes(row.materialId)}
                      disabled={!hasMissingQuestions(row)}
                      onChange={() => onToggle(row.materialId)}
                    />
                  </td>
                  <td>
                    {row.title}
                    {row.status !== "READY" ? (
                      <span className={styles.muted}> · {labels.notReady}</span>
                    ) : null}
                    {row.targets ? null : (
                      <span className={styles.muted}> · {labels.noTargets}</span>
                    )}
                  </td>
                  <CountsCell counts={row.targets} />
                  <CountsCell counts={row.approved} />
                  <CountsCell counts={row.draft} />
                  <CountsCell counts={row.targets ? row.missing : null} isAlert />
                </tr>
              ))}
            </Fragment>
          ))}
          <tr className={planStyles.totalRow}>
            <td />
            <td>{labels.total}</td>
            <CountsCell counts={totals.targets} />
            <CountsCell counts={totals.approved} />
            <CountsCell counts={totals.draft} />
            <CountsCell counts={totals.missing} isAlert />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
