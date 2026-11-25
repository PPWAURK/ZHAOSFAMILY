"use client";

import { useState } from "react";
import type { CreateGenerationJobInput, GenerationEstimate, KnowledgeMaterial } from "@zhao/types";

import CoveragePanel from "../components/CoveragePanel";
import ExamBankLayout from "../components/ExamBankLayout";
import GenerationJobsTable, { ACTIVE_JOB_STATUSES } from "../components/GenerationJobsTable";
import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useInterval } from "../hooks/useInterval";
import {
  cancelGenerationJob,
  createGenerationJob,
  estimateGenerationJob,
  fetchGenerationJobs,
} from "../services/generationJobsApi";
import { fetchKnowledgeMaterials } from "../services/knowledgeBaseApi";
import { formatUsd } from "../utils/examFormat";

const POLL_MS = 10_000;
const DEFAULT_MIX = { single: 50, multiple: 25, boolean: 25 };

type FormProps = {
  copy: ExamBankCopy;
  lang: ExamUiLanguage;
  materials: KnowledgeMaterial[];
  onCreated: () => void;
};

function GenerationForm({ copy, lang, materials, onCreated }: FormProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [count, setCount] = useState(1000);
  const [mix, setMix] = useState(DEFAULT_MIX);
  const [estimate, setEstimate] = useState<GenerationEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const ready = materials.filter((m) => m.status === "READY");
  const input: CreateGenerationJobInput = { materialIds: selected, count, typeMix: mix };
  const isValid = selected.length > 0 && count > 0 && mix.single + mix.multiple + mix.boolean > 0;

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
  const toggle = (id: number) => {
    setEstimate(null);
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  return (
    <div className={styles.panel}>
      <p className={styles.field}>{copy.generation.materials}</p>
      <div className={styles.checkList}>
        {ready.length === 0 ? <span className={styles.muted}>{copy.empty}</span> : null}
        {ready.map((material) => (
          <label key={material.id} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selected.includes(material.id)}
              onChange={() => toggle(material.id)}
            />
            {material.title} ({material.chunkCount})
          </label>
        ))}
      </div>
      <div className={styles.formGrid} style={{ marginTop: 16 }}>
        <label className={styles.field}>
          {copy.generation.count}
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => {
              setEstimate(null);
              setCount(Number(e.target.value));
            }}
          />
        </label>
        {(["single", "multiple", "boolean"] as const).map((type) => (
          <label key={type} className={styles.field}>
            {copy.generation.mix} · {copy.types[type]}
            <input
              type="number"
              min={0}
              max={100}
              value={mix[type]}
              onChange={(e) => {
                setEstimate(null);
                setMix({ ...mix, [type]: Number(e.target.value) });
              }}
            />
          </label>
        ))}
      </div>
      {estimate ? (
        <p className={estimate.isCapped ? styles.error : styles.notice}>
          {copy.generation.estimateResult(
            estimate.requestCount,
            estimate.plannedCount,
            formatUsd(estimate.estimatedCostUsd),
          )}
          {estimate.isCapped ? ` ${copy.generation.capped(estimate.maxPossible)}` : ""}
        </p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions} style={{ marginTop: 16 }}>
        <button
          type="button"
          className={styles.button}
          disabled={!isValid || isBusy}
          onClick={() => void run(async () => setEstimate(await estimateGenerationJob(input)))}
        >
          {copy.generation.estimate}
        </button>
        <button
          type="button"
          className={styles.buttonPrimary}
          disabled={!isValid || isBusy || !estimate}
          onClick={() =>
            void run(async () => {
              await createGenerationJob(input);
              setEstimate(null);
              onCreated();
            })
          }
        >
          {copy.generation.start}
        </button>
      </div>
    </div>
  );
}

function GenerationContent({ copy, lang }: { copy: ExamBankCopy; lang: ExamUiLanguage }) {
  const materials = useAsyncData(fetchKnowledgeMaterials, []);
  const jobs = useAsyncData(fetchGenerationJobs, []);
  const [error, setError] = useState<string | null>(null);
  const hasActiveJob = jobs.data?.some((job) => ACTIVE_JOB_STATUSES.has(job.status)) ?? false;
  useInterval(jobs.reload, hasActiveJob ? POLL_MS : null);

  const cancel = (id: number) => {
    setError(null);
    cancelGenerationJob(id)
      .then(jobs.reload)
      .catch((reason: unknown) => setError(describeExamError(reason, lang)));
  };

  return (
    <>
      <CoveragePanel
        lang={lang}
        refreshKey={jobs.data}
        cancelLabel={copy.cancel}
        onCreated={jobs.reload}
      />
      {materials.data ? (
        <GenerationForm
          copy={copy}
          lang={lang}
          materials={materials.data}
          onCreated={jobs.reload}
        />
      ) : null}
      <h2 className={styles.sectionTitle}>{copy.generation.jobs}</h2>
      {error ? <p className={styles.error}>{error}</p> : null}
      {jobs.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {jobs.data?.length === 0 ? <p className={styles.muted}>{copy.empty}</p> : null}
      {jobs.data?.length ? (
        <GenerationJobsTable copy={copy} lang={lang} jobs={jobs.data} onCancel={cancel} />
      ) : null}
    </>
  );
}

export default function GenerationJobsPage() {
  return (
    <ExamBankLayout active="generation" subtitle={(copy) => copy.generation.subtitle}>
      {({ copy, lang }) => <GenerationContent copy={copy} lang={lang} />}
    </ExamBankLayout>
  );
}
