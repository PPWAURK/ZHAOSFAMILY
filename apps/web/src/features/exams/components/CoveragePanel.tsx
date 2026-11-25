"use client";

import { useState } from "react";
import type { CreateGenerationJobInput, GenerationEstimate } from "@zhao/types";

import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import { EXAM_MATERIAL_COPY } from "../constants/exam-material-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchExamCategories } from "../services/examQuestionsApi";
import {
  createGenerationJob,
  estimateGenerationJob,
  fetchGenerationCoverage,
} from "../services/generationJobsApi";
import { formatUsd } from "../utils/examFormat";
import { hasMissingQuestions } from "../utils/materialCoverage";
import CoverageTable from "./CoverageTable";

type CoveragePanelProps = {
  lang: ExamUiLanguage;
  /** Changes when the job list reloads, so the coverage follows finished jobs. */
  refreshKey: unknown;
  cancelLabel: string;
  onCreated: () => void;
};

/**
 * Bank coverage of every material against its targets, and the 「按目标补题」
 * flow: select materials → estimate (TARGET mode) → confirm → create the job.
 */
export default function CoveragePanel({
  lang,
  refreshKey,
  cancelLabel,
  onCreated,
}: CoveragePanelProps) {
  const labels = EXAM_MATERIAL_COPY[lang].coverage;
  const coverage = useAsyncData(fetchGenerationCoverage, [refreshKey]);
  const categories = useAsyncData(fetchExamCategories, []);
  const [selected, setSelected] = useState<number[]>([]);
  const [estimate, setEstimate] = useState<GenerationEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const rows = coverage.data ?? [];
  const input: CreateGenerationJobInput = { mode: "TARGET", materialIds: selected };

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(describeExamError(reason, lang));
    } finally {
      setIsBusy(false);
    }
  };
  const changeSelection = (next: number[]) => {
    setEstimate(null);
    setSelected(next);
  };
  const toggle = (id: number) =>
    changeSelection(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <section className={styles.panel} aria-label={labels.title}>
      <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>
        {labels.title}
      </h2>
      <p className={styles.muted}>
        {labels.subtitle} {labels.order}
      </p>
      {coverage.error ? (
        <p className={styles.error}>{describeExamError(coverage.error, lang)}</p>
      ) : null}
      {rows.length ? (
        <CoverageTable
          rows={rows}
          categories={categories.data ?? []}
          labels={labels}
          selected={selected}
          onToggle={toggle}
        />
      ) : null}
      {estimate ? (
        <p className={styles.notice}>
          {labels.plan(
            estimate.plannedCount,
            estimate.requestCount,
            formatUsd(estimate.estimatedCostUsd),
          )}
        </p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions} style={{ marginTop: 12 }}>
        <button
          type="button"
          className={styles.button}
          disabled={!rows.some(hasMissingQuestions)}
          onClick={() => changeSelection(rows.filter(hasMissingQuestions).map((r) => r.materialId))}
        >
          {labels.selectMissing}
        </button>
        {selected.length ? (
          <button type="button" className={styles.button} onClick={() => changeSelection([])}>
            {labels.clearSelection}
          </button>
        ) : null}
        <span className={styles.muted}>{labels.selected(selected.length)}</span>
        {estimate ? (
          <>
            <button
              type="button"
              className={styles.buttonPrimary}
              disabled={isBusy}
              onClick={() =>
                void run(async () => {
                  await createGenerationJob(input);
                  changeSelection([]);
                  onCreated();
                })
              }
            >
              {labels.confirm}
            </button>
            <button type="button" className={styles.button} onClick={() => setEstimate(null)}>
              {cancelLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.buttonPrimary}
            disabled={!selected.length || isBusy}
            onClick={() => void run(async () => setEstimate(await estimateGenerationJob(input)))}
          >
            {isBusy ? labels.estimating : labels.fill}
          </button>
        )}
      </div>
    </section>
  );
}
