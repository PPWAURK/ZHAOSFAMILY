"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExamResultQuery, ExamResultRow, ExamTemplate } from "@zhao/types";

import { fetchRestaurants } from "@/features/stores/services/restaurantsApi";
import type { RestaurantApiRecord } from "@/features/stores/types/store";
import { downloadCsv } from "@/features/dashboard/utils/platformReportCsv";

import ExamBankLayout from "../components/ExamBankLayout";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchExamResults } from "../services/examResultsApi";
import { fetchExamTemplates } from "../services/examTemplatesApi";
import { formatDateTime, formatDuration } from "../utils/examFormat";
import { buildExamResultsCsv } from "../utils/examResultsCsv";

const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 1000;

function resultBadge(row: ExamResultRow, copy: ExamBankCopy) {
  const label = row.passed ? copy.results.pass : copy.results.fail;
  return (
    <StatusBadge
      tone={row.passed ? "ok" : "bad"}
      label={row.status === "EXPIRED" ? `${label} · ${copy.results.expired}` : label}
    />
  );
}

/** Fetches every page of the current filter (1000 rows per request) for the CSV. */
async function fetchAllResults(query: ExamResultQuery): Promise<ExamResultRow[]> {
  const rows: ExamResultRow[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchExamResults({ ...query, page, pageSize: EXPORT_PAGE_SIZE });
    rows.push(...result.items);
    if (rows.length >= result.total || result.items.length === 0) return rows;
  }
}

function ResultsContent({ copy, lang }: { copy: ExamBankCopy; lang: ExamUiLanguage }) {
  const [query, setQuery] = useState<ExamResultQuery>({ page: 1, pageSize: PAGE_SIZE });
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const results = useAsyncData(() => fetchExamResults(query), [JSON.stringify(query)]);
  const lookups = useAsyncData<[ExamTemplate[], RestaurantApiRecord[]]>(
    () => Promise.all([fetchExamTemplates(), fetchRestaurants()]),
    [],
  );
  const labels = copy.results;
  const filter = (patch: Partial<ExamResultQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: 1 }));
  const title = (row: { titleZh: string; titleFr: string }) =>
    lang === "zh" ? row.titleZh : row.titleFr;

  const exportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const rows = await fetchAllResults(query);
      downloadCsv(
        `exam-results-${new Date().toISOString().slice(0, 10)}.csv`,
        buildExamResultsCsv(rows),
      );
    } catch (reason) {
      setError(describeExamError(reason, lang));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          {labels.filters.template}
          <select
            value={query.templateId ?? ""}
            onChange={(e) =>
              filter({ templateId: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">{labels.passedOptions.all}</option>
            {(lookups.data?.[0] ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {title(t)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {labels.filters.restaurant}
          <select
            value={query.restaurantId ?? ""}
            onChange={(e) =>
              filter({ restaurantId: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">{labels.passedOptions.all}</option>
            {(lookups.data?.[1] ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {labels.filters.passed}
          <select
            value={query.passed === undefined ? "" : String(query.passed)}
            onChange={(e) =>
              filter({ passed: e.target.value === "" ? undefined : e.target.value === "true" })
            }
          >
            <option value="">{labels.passedOptions.all}</option>
            <option value="true">{labels.passedOptions.true}</option>
            <option value="false">{labels.passedOptions.false}</option>
          </select>
        </label>
        <label className={styles.field}>
          {labels.filters.from}
          <input
            type="date"
            value={query.from ?? ""}
            onChange={(e) => filter({ from: e.target.value || undefined })}
          />
        </label>
        <label className={styles.field}>
          {labels.filters.to}
          <input
            type="date"
            value={query.to?.slice(0, 10) ?? ""}
            onChange={(e) =>
              filter({ to: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined })
            }
          />
        </label>
        <label className={styles.field}>
          {labels.filters.search}
          <input
            defaultValue={query.q ?? ""}
            maxLength={100}
            onBlur={(e) => filter({ q: e.target.value.trim() || undefined })}
          />
        </label>
      </div>

      <div className={styles.examBar}>
        <span className={styles.muted}>{results.data ? labels.total(results.data.total) : ""}</span>
        <button
          type="button"
          className={styles.button}
          disabled={isExporting || !results.data?.total}
          onClick={() => void exportCsv()}
        >
          {labels.exportCsv}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {results.isLoading && !results.data ? <p className={styles.muted}>{copy.loading}</p> : null}
      {results.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {results.data?.items.length === 0 ? <p className={styles.muted}>{copy.empty}</p> : null}
      {results.data?.items.length ? (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {Object.values(labels.columns).map((label, index) => (
                  <th key={`${label}-${index}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.data.items.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.user.name}
                    <br />
                    <span className={styles.muted}>{row.user.email}</span>
                  </td>
                  <td>{row.restaurant.name}</td>
                  <td>{title(row)}</td>
                  <td>
                    {row.score ?? "—"} ({row.correctCount ?? 0}/{row.totalCount})
                  </td>
                  <td>{resultBadge(row, copy)}</td>
                  <td>{formatDateTime(row.submittedAt, lang)}</td>
                  <td>{formatDuration(row.durationSeconds)}</td>
                  <td>
                    <Link
                      className={styles.linkButton}
                      href={`/dashboard/exam-bank/results/detail?attemptId=${row.id}`}
                    >
                      {labels.detail}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {results.data ? (
        <Pagination
          page={query.page ?? 1}
          pageSize={PAGE_SIZE}
          total={results.data.total}
          labels={copy}
          onChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      ) : null}
    </>
  );
}

export default function ExamResultsPage() {
  return (
    <ExamBankLayout
      active="results"
      permission="exam.result.view"
      subtitle={(copy) => copy.results.subtitle}
    >
      {({ copy, lang }) => <ResultsContent copy={copy} lang={lang} />}
    </ExamBankLayout>
  );
}
