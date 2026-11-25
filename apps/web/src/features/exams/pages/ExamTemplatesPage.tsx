"use client";

import { useState } from "react";
import type { ExamCategory, ExamTemplate, ExamTemplateInput, KnowledgeMaterial } from "@zhao/types";

import ExamBankLayout from "../components/ExamBankLayout";
import StatusBadge from "../components/StatusBadge";
import TemplateEditorModal from "../components/TemplateEditorModal";
import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useConfirmAction } from "../hooks/useConfirmAction";
import { fetchExamCategories } from "../services/examQuestionsApi";
import { fetchExamQuestionStatistics } from "../services/examResultsApi";
import {
  createExamTemplate,
  deleteExamTemplate,
  fetchExamTemplates,
  updateExamTemplate,
} from "../services/examTemplatesApi";
import { fetchKnowledgeMaterials } from "../services/knowledgeBaseApi";

type EditorState = { template: ExamTemplate | null } | null;

function QuestionStats({ templateId, copy }: { templateId: number; copy: ExamBankCopy }) {
  const stats = useAsyncData(() => fetchExamQuestionStatistics(templateId), [templateId]);
  if (stats.isLoading) return <p className={styles.muted}>{copy.loading}</p>;
  if (!stats.data?.length) return <p className={styles.muted}>{copy.empty}</p>;
  return (
    <table className={styles.table}>
      <tbody>
        {stats.data.slice(0, 20).map((row) => (
          <tr key={row.questionId}>
            <td>{row.correctRate}%</td>
            <td>
              {row.promptZh}
              <br />
              <span className={styles.muted}>{row.promptFr}</span>
            </td>
            <td>
              {row.correctCount}/{row.answeredCount}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TemplatesContent({ copy, lang }: { copy: ExamBankCopy; lang: ExamUiLanguage }) {
  const confirm = useConfirmAction();
  const templates = useAsyncData(fetchExamTemplates, []);
  const lookups = useAsyncData<[ExamCategory[], KnowledgeMaterial[]]>(
    () => Promise.all([fetchExamCategories(), fetchKnowledgeMaterials()]),
    [],
  );
  const [editor, setEditor] = useState<EditorState>(null);
  const [statsFor, setStatsFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const labels = copy.templates;

  const save = async (input: ExamTemplateInput) => {
    setEditorError(null);
    try {
      if (editor?.template) await updateExamTemplate(editor.template.id, input);
      else await createExamTemplate(input);
      setEditor(null);
      templates.reload();
    } catch (reason) {
      setEditorError(describeExamError(reason, lang));
    }
  };
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      templates.reload();
    } catch (reason) {
      setError(describeExamError(reason, lang));
    }
  };
  const remove = async (template: ExamTemplate) => {
    if (await confirm({ message: `${template.titleZh}: ${copy.confirmDelete}`, tone: "danger" })) {
      await run(() => deleteExamTemplate(template.id));
    }
  };

  return (
    <>
      <div className={styles.actions} style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={() => setEditor({ template: null })}
        >
          {labels.newTemplate}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {templates.isLoading && !templates.data ? (
        <p className={styles.muted}>{copy.loading}</p>
      ) : null}
      {templates.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {templates.data?.length === 0 ? <p className={styles.muted}>{copy.empty}</p> : null}
      {templates.data?.length ? (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {Object.values(labels.columns).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.data.map((template) => (
                <tr key={template.id}>
                  <td>
                    <strong>{template.titleZh}</strong>
                    <br />
                    <span className={styles.muted}>{template.titleFr}</span>
                  </td>
                  <td>
                    {template.questionCount}
                    <br />
                    <span className={styles.muted}>
                      {template.singleCount}/{template.multipleCount}/{template.booleanCount}
                    </span>
                    {template.sectionCount > 1 ? (
                      <>
                        <br />
                        <span className={styles.badge}>
                          {labels.sectionCount(template.sectionCount)}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {template.timeLimitMinutes
                      ? labels.minutes(template.timeLimitMinutes)
                      : labels.unlimited}
                  </td>
                  <td>{template.passingScore}%</td>
                  <td>{template.attemptCount}</td>
                  <td>
                    <StatusBadge
                      tone={template.isActive ? "ok" : "neutral"}
                      label={template.isActive ? labels.active : labels.inactive}
                    />
                    {template.accessMode === "CODE" ? (
                      <>
                        <br />
                        <span className={styles.muted}>{labels.accessModes.CODE}</span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={() => {
                          setEditorError(null);
                          setEditor({ template });
                        }}
                      >
                        {copy.edit}
                      </button>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={() =>
                          void run(() =>
                            updateExamTemplate(template.id, { isActive: !template.isActive }),
                          )
                        }
                      >
                        {template.isActive ? labels.deactivate : labels.activate}
                      </button>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={() => setStatsFor(statsFor === template.id ? null : template.id)}
                      >
                        {labels.stats}
                      </button>
                      {template.attemptCount === 0 ? (
                        <button
                          type="button"
                          className={styles.buttonDanger}
                          onClick={() => void remove(template)}
                        >
                          {copy.delete}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {statsFor ? (
        <>
          <h2 className={styles.sectionTitle}>{labels.stats}</h2>
          <QuestionStats templateId={statsFor} copy={copy} />
        </>
      ) : null}
      {editor ? (
        <TemplateEditorModal
          template={editor.template}
          categories={lookups.data?.[0] ?? []}
          materials={(lookups.data?.[1] ?? []).filter((m) => m.status === "READY")}
          copy={copy}
          lang={lang}
          error={editorError}
          onSave={(input) => void save(input)}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </>
  );
}

export default function ExamTemplatesPage() {
  return (
    <ExamBankLayout active="templates" subtitle={(copy) => copy.templates.subtitle}>
      {({ copy, lang }) => <TemplatesContent copy={copy} lang={lang} />}
    </ExamBankLayout>
  );
}
