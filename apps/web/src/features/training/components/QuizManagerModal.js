"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addTrainingQuizQuestion,
  deleteTrainingQuiz,
  deleteTrainingQuizQuestion,
  fetchTrainingQuizAdmin,
  generateTrainingQuizDraft,
  updateTrainingQuizQuestion,
  upsertTrainingQuiz,
} from "@/features/training/services/trainingQuizApi";
import styles from "@/features/training/components/quiz-manager.module.css";

const OPTION_LETTERS = "ABCDEFGH";

const QUESTION_TYPE_LABELS = {
  single: "单选",
  multiple: "多选",
  boolean: "判断",
};

function optionKeyForIndex(index) {
  return OPTION_LETTERS[index]?.toLowerCase() || `o${index}`;
}

function blankQuestionForm(type = "single") {
  if (type === "boolean") {
    return {
      type,
      prompt: "",
      options: [
        { key: "true", label: "正确" },
        { key: "false", label: "错误" },
      ],
      correctKeys: [],
      explanation: "",
    };
  }

  return {
    type,
    prompt: "",
    options: [
      { key: "a", label: "" },
      { key: "b", label: "" },
    ],
    correctKeys: [],
    explanation: "",
  };
}

function questionToForm(question) {
  return {
    type: question.type,
    prompt: question.prompt,
    options: question.options.map((option) => ({ ...option })),
    correctKeys: [...question.correctKeys],
    explanation: question.explanation || "",
  };
}

export default function QuizManagerModal({ materialId, materialTitle, onClose }) {
  const [view, setView] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    passingScore: 80,
    questionCount: 0,
    maxAttempts: "",
  });
  const [questionForm, setQuestionForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  const applyView = useCallback((nextView) => {
    setView(nextView);
    if (nextView) {
      setSettings({
        passingScore: nextView.passingScore,
        questionCount: nextView.questionCount,
        maxAttempts:
          nextView.maxAttempts === null ? "" : String(nextView.maxAttempts),
      });
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const nextView = await fetchTrainingQuizAdmin(materialId);
      applyView(nextView);
    } catch (loadError) {
      setError(loadError.message || "测验加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [materialId, applyView]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runMutation(action) {
    setIsBusy(true);
    setError("");
    try {
      const nextView = await action();
      applyView(nextView);
      return true;
    } catch (mutationError) {
      setError(mutationError.message || "操作失败");
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveSettings() {
    await runMutation(() =>
      upsertTrainingQuiz(materialId, {
        passingScore: Number(settings.passingScore),
        questionCount: Number(settings.questionCount),
        maxAttempts:
          settings.maxAttempts === "" ? null : Number(settings.maxAttempts),
      }),
    );
  }

  async function handleDeleteQuiz() {
    if (!window.confirm("确认删除整个测验及其全部题目？此操作无法撤销。")) return;
    const ok = await runMutation(async () => {
      await deleteTrainingQuiz(materialId);
      return null;
    });
    if (ok) {
      setView(null);
      setQuestionForm(null);
    }
  }

  async function handleSaveQuestion() {
    if (!questionForm) return;
    const payload = {
      type: questionForm.type,
      prompt: questionForm.prompt.trim(),
      options: questionForm.options.map((option) => ({
        key: option.key,
        label: option.label.trim(),
      })),
      correctKeys: questionForm.correctKeys,
      explanation: questionForm.explanation.trim() || null,
    };

    const validationError = validateQuestion(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    const ok = await runMutation(() =>
      editingId
        ? updateTrainingQuizQuestion(editingId, payload)
        : addTrainingQuizQuestion(materialId, payload),
    );
    if (ok) {
      setQuestionForm(null);
      setEditingId(null);
    }
  }

  async function handleDeleteQuestion(questionId) {
    if (!window.confirm("确认删除这道题？")) return;
    await runMutation(() => deleteTrainingQuizQuestion(questionId));
  }

  async function handleGenerate() {
    setAiMessage("");
    setIsBusy(true);
    try {
      const draft = await generateTrainingQuizDraft(materialId);
      setAiMessage(`AI 生成了 ${draft.length} 道草稿题，请审核后保存。`);
    } catch (generateError) {
      const code = generateError.message || "";
      setAiMessage(
        code.includes("NOT_CONFIGURED")
          ? "AI 出题尚未配置（需要在后端设置 Claude API Key）。"
          : code.includes("NOT_IMPLEMENTED")
            ? "AI 出题接口已就绪，等待接入 Claude（需要 API Key）。"
            : "AI 生成失败，请稍后再试。",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function startNewQuestion() {
    setEditingId(null);
    setQuestionForm(blankQuestionForm("single"));
  }

  function startEditQuestion(question) {
    setEditingId(question.id);
    setQuestionForm(questionToForm(question));
  }

  const questions = view?.questions ?? [];
  const effectiveCount =
    settings.questionCount > 0 &&
    settings.questionCount < questions.length
      ? Number(settings.questionCount)
      : questions.length;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>总部出题 · 测验管理</p>
            <h2 className={styles.title}>{materialTitle}</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            关闭
          </button>
        </header>

        {isLoading ? (
          <p className={styles.muted}>加载中…</p>
        ) : (
          <div className={styles.body}>
            {error ? <p className={styles.error}>{error}</p> : null}

            <section className={styles.settings}>
              <h3 className={styles.sectionTitle}>测验设置</h3>
              <div className={styles.settingsGrid}>
                <label className={styles.field}>
                  及格分(%)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.passingScore}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        passingScore: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  每次抽题数(0=全部)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.questionCount}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        questionCount: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  最大重考次数(空=不限)
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={settings.maxAttempts}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        maxAttempts: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <p className={styles.hint}>
                题库共 {questions.length} 题，员工每次答题随机抽{" "}
                <b>{effectiveCount}</b> 题。
              </p>
              <div className={styles.settingsActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={isBusy}
                  onClick={handleSaveSettings}
                >
                  保存设置
                </button>
                {view ? (
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={isBusy}
                    onClick={handleDeleteQuiz}
                  >
                    删除整个测验
                  </button>
                ) : (
                  <span className={styles.muted}>尚未创建测验，加题或保存设置即可创建。</span>
                )}
              </div>
            </section>

            <section className={styles.questions}>
              <div className={styles.questionsHeader}>
                <h3 className={styles.sectionTitle}>题库（{questions.length}）</h3>
                <div className={styles.questionsActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={isBusy}
                    onClick={handleGenerate}
                    title="根据 PDF 内容用 AI 生成草稿题（需配置 API Key）"
                  >
                    AI 生成草稿
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={isBusy}
                    onClick={startNewQuestion}
                  >
                    + 手动加题
                  </button>
                </div>
              </div>
              {aiMessage ? <p className={styles.hint}>{aiMessage}</p> : null}

              {questions.length === 0 ? (
                <p className={styles.muted}>还没有题目，点「手动加题」或「AI 生成草稿」开始。</p>
              ) : (
                <ol className={styles.questionList}>
                  {questions.map((question) => (
                    <li key={question.id} className={styles.questionItem}>
                      <div className={styles.questionMain}>
                        <span className={styles.typeTag}>
                          {QUESTION_TYPE_LABELS[question.type]}
                        </span>
                        <span className={styles.questionPrompt}>
                          {question.prompt}
                        </span>
                      </div>
                      <ul className={styles.optionList}>
                        {question.options.map((option) => (
                          <li
                            key={option.key}
                            className={
                              question.correctKeys.includes(option.key)
                                ? styles.optionCorrect
                                : styles.option
                            }
                          >
                            {question.correctKeys.includes(option.key) ? "✓ " : ""}
                            {option.label}
                          </li>
                        ))}
                      </ul>
                      <div className={styles.questionActions}>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => startEditQuestion(question)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className={styles.linkDanger}
                          disabled={isBusy}
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          删除
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {questionForm ? (
              <QuestionEditor
                form={questionForm}
                isEditing={Boolean(editingId)}
                isBusy={isBusy}
                onChange={setQuestionForm}
                onCancel={() => {
                  setQuestionForm(null);
                  setEditingId(null);
                }}
                onSave={handleSaveQuestion}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function validateQuestion(payload) {
  if (!payload.prompt) return "请填写题干。";
  if (payload.options.length < 2) return "至少需要两个选项。";
  if (payload.options.some((option) => !option.label)) return "每个选项都要有内容。";
  if (payload.correctKeys.length === 0) return "请至少标记一个正确答案。";
  if (payload.type !== "multiple" && payload.correctKeys.length !== 1) {
    return "单选/判断题只能有一个正确答案。";
  }
  return "";
}

function QuestionEditor({ form, isEditing, isBusy, onChange, onCancel, onSave }) {
  function setType(type) {
    onChange(blankQuestionForm(type));
  }

  function toggleCorrect(key) {
    onChange((prev) => {
      if (prev.type === "multiple") {
        const exists = prev.correctKeys.includes(key);
        return {
          ...prev,
          correctKeys: exists
            ? prev.correctKeys.filter((value) => value !== key)
            : [...prev.correctKeys, key],
        };
      }
      return { ...prev, correctKeys: [key] };
    });
  }

  function setOptionLabel(index, label) {
    onChange((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, label } : option,
      ),
    }));
  }

  function addOption() {
    onChange((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { key: optionKeyForIndex(prev.options.length), label: "" },
      ],
    }));
  }

  function removeOption(index) {
    onChange((prev) => {
      const removedKey = prev.options[index]?.key;
      return {
        ...prev,
        options: prev.options.filter((_, optionIndex) => optionIndex !== index),
        correctKeys: prev.correctKeys.filter((key) => key !== removedKey),
      };
    });
  }

  const isBoolean = form.type === "boolean";

  return (
    <section className={styles.editor}>
      <h3 className={styles.sectionTitle}>{isEditing ? "编辑题目" : "新增题目"}</h3>
      <div className={styles.typeRow}>
        {["single", "multiple", "boolean"].map((type) => (
          <label key={type} className={styles.typeOption}>
            <input
              type="radio"
              name="questionType"
              checked={form.type === type}
              onChange={() => setType(type)}
            />
            {QUESTION_TYPE_LABELS[type]}
          </label>
        ))}
      </div>

      <label className={styles.field}>
        题干
        <textarea
          rows={2}
          value={form.prompt}
          onChange={(event) =>
            onChange((prev) => ({ ...prev, prompt: event.target.value }))
          }
        />
      </label>

      <div className={styles.optionEditor}>
        <span className={styles.fieldLabel}>
          选项（勾选正确答案，{form.type === "multiple" ? "可多选" : "单选"}）
        </span>
        {form.options.map((option, index) => (
          <div key={option.key} className={styles.optionEditRow}>
            <input
              type={form.type === "multiple" ? "checkbox" : "radio"}
              name="correctKey"
              checked={form.correctKeys.includes(option.key)}
              onChange={() => toggleCorrect(option.key)}
            />
            <span className={styles.optionKey}>{option.key.toUpperCase()}</span>
            <input
              type="text"
              className={styles.optionInput}
              value={option.label}
              readOnly={isBoolean}
              placeholder="选项内容"
              onChange={(event) => setOptionLabel(index, event.target.value)}
            />
            {!isBoolean && form.options.length > 2 ? (
              <button
                type="button"
                className={styles.linkDanger}
                onClick={() => removeOption(index)}
              >
                移除
              </button>
            ) : null}
          </div>
        ))}
        {!isBoolean && form.options.length < 8 ? (
          <button type="button" className={styles.secondaryButton} onClick={addOption}>
            + 增加选项
          </button>
        ) : null}
      </div>

      <label className={styles.field}>
        解析（答错后展示，可选）
        <textarea
          rows={2}
          value={form.explanation}
          onChange={(event) =>
            onChange((prev) => ({ ...prev, explanation: event.target.value }))
          }
        />
      </label>

      <div className={styles.editorActions}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={isBusy}
          onClick={onSave}
        >
          {isEditing ? "保存修改" : "添加到题库"}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          取消
        </button>
      </div>
    </section>
  );
}
