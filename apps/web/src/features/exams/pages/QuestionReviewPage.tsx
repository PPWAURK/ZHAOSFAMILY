"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  ExamQuestion,
  ExamQuestionDifficulty,
  ExamQuestionInput,
  ExamQuestionQuery,
  ExamQuestionStatus,
  ExamQuestionType,
  ExamReviewAction,
} from "@zhao/types";

import CategoryManager from "../components/CategoryManager";
import ExamBankLayout from "../components/ExamBankLayout";
import Pagination from "../components/Pagination";
import QuestionEditorModal from "../components/QuestionEditorModal";
import ReviewQuestionCard from "../components/ReviewQuestionCard";
import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useReviewShortcuts } from "../hooks/useReviewShortcuts";
import { downloadCsv } from "@/features/dashboard/utils/platformReportCsv";
import { EXAM_DIFFICULTIES } from "../utils/difficultyTargets";
import { buildExamQuestionsCsv } from "../utils/examQuestionsCsv";
import {
  createExamQuestion,
  fetchAllExamQuestions,
  fetchExamCategories,
  fetchExamQuestions,
  reviewExamQuestions,
  updateExamQuestion,
} from "../services/examQuestionsApi";

const PAGE_SIZE = 20;
const STATUSES: ExamQuestionStatus[] = ["DRAFT", "APPROVED", "REJECTED", "ARCHIVED"];
const TYPES: ExamQuestionType[] = ["single", "multiple", "boolean"];

type EditorState = { question: ExamQuestion | null } | null;

function initialQuery(jobId: string | null): ExamQuestionQuery {
  const parsed = Number(jobId);
  return {
    status: "DRAFT",
    page: 1,
    pageSize: PAGE_SIZE,
    ...(parsed > 0 ? { jobId: parsed } : {}),
  };
}

function ReviewContent({ copy, lang }: { copy: ExamBankCopy; lang: ExamUiLanguage }) {
  const params = useSearchParams();
  const [query, setQuery] = useState<ExamQuestionQuery>(() => initialQuery(params.get("jobId")));
  const [selected, setSelected] = useState<number[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [editor, setEditor] = useState<EditorState>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const questions = useAsyncData(() => fetchExamQuestions(query), [JSON.stringify(query)]);
  const categories = useAsyncData(fetchExamCategories, []);
  const items = questions.data?.items ?? [];

  useEffect(() => {
    setSelected([]);
    setFocusIndex(0);
  }, [questions.data]);

  const filter = (patch: Partial<ExamQuestionQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: 1 }));
  const review = useCallback(
    async (ids: number[], action: ExamReviewAction) => {
      if (!ids.length) return;
      setError(null);
      try {
        await reviewExamQuestions(ids, action);
        questions.reload();
      } catch (reason) {
        setError(describeExamError(reason, lang));
      }
    },
    [lang, questions],
  );
  const focused = items[focusIndex];
  useReviewShortcuts({
    isEnabled: !editor && items.length > 0,
    onNext: useCallback(
      () => setFocusIndex((i) => Math.min(i + 1, items.length - 1)),
      [items.length],
    ),
    onPrevious: useCallback(() => setFocusIndex((i) => Math.max(i - 1, 0)), []),
    onApprove: useCallback(
      () => void (focused && review([focused.id], "approve")),
      [focused, review],
    ),
    onReject: useCallback(
      () => void (focused && review([focused.id], "reject")),
      [focused, review],
    ),
  });
  useEffect(() => {
    if (!focused || typeof document === "undefined") return;
    document
      .querySelector(`[data-question-id="${focused.id}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [focused]);

  /** Exports every question matching the current filters, not just this page. */
  const exportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const rows = await fetchAllExamQuestions(query);
      downloadCsv(
        `exam-questions-${new Date().toISOString().slice(0, 10)}.csv`,
        buildExamQuestionsCsv(rows),
      );
    } catch (reason) {
      setError(describeExamError(reason, lang));
    } finally {
      setIsExporting(false);
    }
  };

  const save = async (input: ExamQuestionInput) => {
    setEditorError(null);
    try {
      if (editor?.question) await updateExamQuestion(editor.question.id, input);
      else await createExamQuestion(input);
      setEditor(null);
      questions.reload();
    } catch (reason) {
      setEditorError(describeExamError(reason, lang));
    }
  };
  const toggle = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  return (
    <>
      <CategoryManager
        categories={categories.data ?? []}
        copy={copy}
        lang={lang}
        onChanged={categories.reload}
      />
      <div className={styles.formGrid}>
        <label className={styles.field}>
          {copy.review.filters.status}
          <select
            value={query.status ?? ""}
            onChange={(e) =>
              filter({ status: (e.target.value || undefined) as ExamQuestionStatus })
            }
          >
            <option value="">{copy.review.all}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {copy.questionStatuses[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {copy.review.filters.type}
          <select
            value={query.type ?? ""}
            onChange={(e) => filter({ type: (e.target.value || undefined) as ExamQuestionType })}
          >
            <option value="">{copy.review.all}</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {copy.types[t]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {copy.review.filters.difficulty}
          <select
            value={query.difficulty ?? ""}
            onChange={(e) =>
              filter({ difficulty: (e.target.value || undefined) as ExamQuestionDifficulty })
            }
          >
            <option value="">{copy.review.all}</option>
            {EXAM_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {copy.difficulties[d]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {copy.review.filters.category}
          <select
            value={query.categoryId ?? ""}
            onChange={(e) =>
              filter({ categoryId: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">{copy.review.all}</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameZh} / {c.nameFr}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {copy.review.filters.job}
          <input
            type="number"
            min={1}
            value={query.jobId ?? ""}
            onChange={(e) => filter({ jobId: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label className={styles.field}>
          {copy.review.filters.search}
          <input
            defaultValue={query.q ?? ""}
            maxLength={100}
            onBlur={(e) => filter({ q: e.target.value.trim() || undefined })}
          />
        </label>
      </div>

      <div className={styles.examBar}>
        <div className={styles.actions}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={items.length > 0 && selected.length === items.length}
              onChange={(e) => setSelected(e.target.checked ? items.map((q) => q.id) : [])}
            />
            {copy.review.selectPage}
          </label>
          <span className={styles.muted}>{copy.review.selected(selected.length)}</span>
          {questions.data ? <span className={styles.muted}>· {questions.data.total}</span> : null}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.buttonPrimary}
            disabled={!selected.length}
            onClick={() => void review(selected, "approve")}
          >
            {copy.review.approve}
          </button>
          <button
            type="button"
            className={styles.buttonDanger}
            disabled={!selected.length}
            onClick={() => void review(selected, "reject")}
          >
            {copy.review.reject}
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={!selected.length}
            onClick={() => void review(selected, "archive")}
          >
            {copy.review.archive}
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => setEditor({ question: null })}
          >
            {copy.review.newQuestion}
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={isExporting || !questions.data?.total}
            onClick={() => void exportCsv()}
          >
            {isExporting ? copy.review.exporting : copy.review.exportCsv}
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {questions.isLoading && !questions.data ? (
        <p className={styles.muted}>{copy.loading}</p>
      ) : null}
      {questions.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {questions.data && items.length === 0 ? <p className={styles.muted}>{copy.empty}</p> : null}
      {items.map((question, index) => (
        <ReviewQuestionCard
          key={question.id}
          question={question}
          copy={copy}
          isSelected={selected.includes(question.id)}
          isFocused={index === focusIndex}
          onToggleSelect={() => toggle(question.id)}
          onReview={(action) => void review([question.id], action)}
          onEdit={() => {
            setEditorError(null);
            setEditor({ question });
          }}
        />
      ))}
      {questions.data ? (
        <Pagination
          page={query.page ?? 1}
          pageSize={PAGE_SIZE}
          total={questions.data.total}
          labels={copy}
          onChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      ) : null}
      {editor ? (
        <QuestionEditorModal
          question={editor.question}
          categories={categories.data ?? []}
          copy={copy}
          error={editorError}
          onSave={(input) => void save(input)}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </>
  );
}

export default function QuestionReviewPage() {
  return (
    <ExamBankLayout active="review" subtitle={(copy) => copy.review.subtitle}>
      {({ copy, lang }) => <ReviewContent copy={copy} lang={lang} />}
    </ExamBankLayout>
  );
}
