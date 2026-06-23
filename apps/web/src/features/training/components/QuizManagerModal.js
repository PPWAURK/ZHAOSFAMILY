"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addTrainingQuizQuestion,
  deleteTrainingQuiz,
  deleteTrainingQuizQuestion,
  fetchTrainingQuizAdmin,
  generateTrainingQuizDraftSSE,
  updateTrainingQuizQuestion,
  upsertTrainingQuiz,
} from "@/features/training/services/trainingQuizApi";
import AiConfigPanel from "@/features/training/components/AiConfigPanel";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider";
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

const QUIZ_LANGS = ["zh", "fr", "bn"];
const QUIZ_LANG_LABELS = { zh: "中", fr: "Fr", bn: "বাং" };

// Maps a generation error code to a clear, actionable Chinese message.
function aiErrorMessage(code) {
  if (code.includes("INSUFFICIENT_CREDITS")) {
    return "❌ 生成失败：模型供应商额度不足或已用尽。请到供应商后台充值，或在「AI 出题设置」里换一个有额度的 key / 服务商。";
  }
  if (code.includes("RATE_LIMITED")) {
    return "⏳ 生成失败：触发供应商限流（请求过大或过于频繁）。请稍等一会儿重试，或换用额度更高的服务商。";
  }
  if (code.includes("UNAUTHORIZED")) {
    return "🔑 生成失败：API Key 无效或与服务地址不匹配。请在「AI 出题设置」里检查 key 和 baseURL。";
  }
  if (code.includes("NOT_CONFIGURED")) {
    return "AI 出题尚未配置。请在「AI 出题设置」里填好 API Key、服务地址和模型。";
  }
  if (code.includes("NO_SOURCE")) {
    return "无法读取该资料内容（仅支持有文字的 PDF），请改用手动加题。";
  }
  return "AI 生成失败，请稍后再试。";
}

// AI drafts arrive as {zh,fr,bn} objects; pick the primary rendering for the
// base columns / single-language editor.
function pickPrimary(localized) {
  if (!localized || typeof localized !== "object") return "";
  return localized.zh || localized.fr || localized.bn || "";
}

function localizedLanguages(localized) {
  if (!localized || typeof localized !== "object") return [];
  return QUIZ_LANGS.filter((lang) => localized[lang]);
}

// Renders a localized field across all its languages so HQ can review zh/fr/bn.
function LocalizedLines({ localized, textClassName, inline }) {
  const langs = localizedLanguages(localized);
  if (langs.length === 0) return null;
  return (
    <span className={inline ? styles.localizedInline : styles.localizedBlock}>
      {langs.map((lang) => (
        <span key={lang} className={textClassName || styles.localizedLine}>
          <span className={styles.langPrefix}>{QUIZ_LANG_LABELS[lang]}</span>
          {localized[lang]}
        </span>
      ))}
    </span>
  );
}

// Maps a trilingual draft into the question input: base columns hold the
// primary language, `translations` carries all languages for the employee toggle.
function draftToQuestionInput(draft) {
  return {
    type: draft.type,
    prompt: pickPrimary(draft.prompt),
    options: draft.options.map((option) => ({
      key: option.key,
      label: pickPrimary(option.label),
    })),
    correctKeys: draft.correctKeys,
    explanation: draft.explanation ? pickPrimary(draft.explanation) : null,
    translations: {
      prompt: draft.prompt || {},
      options: Object.fromEntries(
        draft.options.map((option) => [option.key, option.label || {}]),
      ),
      explanation: draft.explanation || null,
    },
  };
}

export default function QuizManagerModal({ materialId, materialTitle, onClose }) {
  const confirm = useConfirm();
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
  const [aiDrafts, setAiDrafts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const abortRef = useRef(null);

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
    if (
      !(await confirm({
        message: "确认删除整个测验及其全部题目？此操作无法撤销。",
        tone: "danger",
      }))
    )
      return;
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
    if (!(await confirm({ message: "确认删除这道题？", tone: "danger" }))) return;
    await runMutation(() => deleteTrainingQuizQuestion(questionId));
  }

  function handleGenerate() {
    setAiMessage("");
    setAiDrafts([]);
    setGenerationProgress({ generated: 0, total: 10, batchesDone: 0, batchesTotal: 2 });
    setIsGenerating(true);

    const controller = generateTrainingQuizDraftSSE(materialId, {
      onProgress(progress) {
        setGenerationProgress(progress);
      },
      onComplete(drafts) {
        setAiDrafts(drafts);
        setAiMessage(
          drafts.length > 0
            ? `AI 生成了 ${drafts.length} 道草稿题，请逐条审核后采用。`
            : "AI 未能从该资料生成题目，请检查资料内容或改用手动加题。",
        );
        setIsGenerating(false);
        setGenerationProgress(null);
      },
      onError(error) {
        const msg = error.message || "";
        setAiDrafts([]);
        setAiMessage(aiErrorMessage(msg));
        setIsGenerating(false);
        setGenerationProgress(null);
      },
    });

    abortRef.current = controller;
  }

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function adoptDraft(index) {
    const draft = aiDrafts[index];
    if (!draft) return;
    const ok = await runMutation(() =>
      addTrainingQuizQuestion(materialId, draftToQuestionInput(draft)),
    );
    if (ok) {
      setAiDrafts((prev) => prev.filter((_, draftIndex) => draftIndex !== index));
    }
  }

  function editDraft(index) {
    const draft = aiDrafts[index];
    if (!draft) return;
    setEditingId(null);
    // The manual editor is single-language; load the primary rendering.
    setQuestionForm({
      type: draft.type,
      prompt: pickPrimary(draft.prompt),
      options: draft.options.map((option) => ({
        key: option.key,
        label: pickPrimary(option.label),
      })),
      correctKeys: [...draft.correctKeys],
      explanation: pickPrimary(draft.explanation),
    });
    setAiDrafts((prev) => prev.filter((_, draftIndex) => draftIndex !== index));
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

            <AiConfigPanel />

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
                    disabled={isBusy || isGenerating}
                    onClick={handleGenerate}
                    title="根据 PDF 内容用 AI 生成草稿题（需配置 AI_API_KEY 或 OPENROUTER_API_KEY）"
                  >
                    {isGenerating ? "AI 生成中…" : "AI 生成草稿"}
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
              {isGenerating && generationProgress ? (
                <div className={styles.progressBar}>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.round((generationProgress.generated / generationProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className={styles.progressLabel}>
                    {generationProgress.generated}/{generationProgress.total}
                  </span>
                </div>
              ) : null}

              {aiMessage ? <p className={styles.hint}>{aiMessage}</p> : null}

              {aiDrafts.length > 0 ? (
                <div className={styles.draftPanel}>
                  <p className={styles.draftHeader}>
                    AI 草稿（待审核 {aiDrafts.length}）—— 采用前请核对答案
                  </p>
                  <ol className={styles.questionList}>
                    {aiDrafts.map((draft, index) => (
                      <li key={index} className={styles.questionItem}>
                        <div className={styles.questionMain}>
                          <span className={styles.typeTag}>
                            {QUESTION_TYPE_LABELS[draft.type]}
                          </span>
                          <LocalizedLines
                            localized={draft.prompt}
                            textClassName={styles.questionPrompt}
                          />
                        </div>
                        <ul className={styles.optionList}>
                          {draft.options.map((option) => (
                            <li
                              key={option.key}
                              className={
                                draft.correctKeys.includes(option.key)
                                  ? styles.optionCorrect
                                  : styles.option
                              }
                            >
                              {draft.correctKeys.includes(option.key) ? "✓ " : ""}
                              <LocalizedLines localized={option.label} inline />
                            </li>
                          ))}
                        </ul>
                        {draft.explanation ? (
                          <div className={styles.hint}>
                            解析：
                            <LocalizedLines localized={draft.explanation} inline />
                          </div>
                        ) : null}
                        <div className={styles.questionActions}>
                          <button
                            type="button"
                            className={styles.linkAdopt}
                            disabled={isBusy}
                            onClick={() => adoptDraft(index)}
                          >
                            采用
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => editDraft(index)}
                          >
                            编辑后采用
                          </button>
                          <button
                            type="button"
                            className={styles.linkDanger}
                            disabled={isBusy}
                            onClick={() =>
                              setAiDrafts((prev) =>
                                prev.filter((_, i) => i !== index),
                              )
                            }
                          >
                            忽略
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

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
