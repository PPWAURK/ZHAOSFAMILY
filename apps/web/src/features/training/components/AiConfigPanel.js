"use client";

import { useEffect, useState } from "react";

import {
  fetchAiQuizConfig,
  updateAiQuizConfig,
} from "@/features/training/services/trainingQuizApi";
import styles from "@/features/training/components/quiz-manager.module.css";

const SOURCE_LABELS = {
  db: "网页配置",
  env: "服务器 .env",
  none: "未配置",
};

export default function AiConfigPanel() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    apiKey: "",
    baseUrl: "",
    model: "",
    maxTokens: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function applyConfig(next) {
    setConfig(next);
    setForm({
      apiKey: "",
      baseUrl: next.baseUrl || "",
      model: next.model || "",
      maxTokens: next.maxTokens ? String(next.maxTokens) : "",
    });
  }

  useEffect(() => {
    if (!open || config) return;
    fetchAiQuizConfig()
      .then(applyConfig)
      .catch((loadError) => setError(loadError.message || "配置加载失败"));
  }, [open, config]);

  async function handleSave() {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        maxTokens: form.maxTokens === "" ? undefined : Number(form.maxTokens),
      };
      // Only send the key when the manager actually typed a new one.
      if (form.apiKey.trim()) {
        payload.apiKey = form.apiKey.trim();
      }
      const next = await updateAiQuizConfig(payload);
      applyConfig(next);
      setMessage("已保存。生成功能会立即使用新配置。");
    } catch (saveError) {
      const code = saveError.message || "";
      setError(
        code.includes("AI_API_KEY_TOO_SHORT")
          ? "API Key 太短，疑似没粘完整。请复制完整的 key（如 sk-or-v1-… 70 多位）再保存。"
          : code || "保存失败",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.aiConfig}>
      <button
        type="button"
        className={styles.aiConfigToggle}
        onClick={() => setOpen((value) => !value)}
      >
        <span>⚙️ AI 出题设置（API Key / 服务地址 / 模型）</span>
        <span>{open ? "收起 ▲" : "展开 ▼"}</span>
      </button>

      {open ? (
        <div className={styles.aiConfigBody}>
          {error ? <p className={styles.error}>{error}</p> : null}
          {!config ? (
            <p className={styles.muted}>加载中…</p>
          ) : (
            <>
              <p className={styles.hint}>
                当前密钥：
                <b>{config.hasApiKey ? config.apiKeyMasked : "未设置"}</b>
                {"  "}·{"  "}来源：{SOURCE_LABELS[config.apiKeySource]}
              </p>

              <label className={styles.field}>
                API Key（留空则不修改；填新值会覆盖）
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    config.hasApiKey ? "已设置，输入新值可替换" : "粘贴 API Key"
                  }
                  value={form.apiKey}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, apiKey: event.target.value }))
                  }
                />
              </label>

              <label className={styles.field}>
                服务地址 baseURL
                <input
                  type="text"
                  placeholder="https://api.groq.com/openai/v1"
                  value={form.baseUrl}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, baseUrl: event.target.value }))
                  }
                />
              </label>

              <div className={styles.settingsGrid}>
                <label className={styles.field}>
                  模型名
                  <input
                    type="text"
                    placeholder="qwen/qwen3-32b"
                    value={form.model}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, model: event.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  max_tokens
                  <input
                    type="number"
                    min={256}
                    max={32000}
                    value={form.maxTokens}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        maxTokens: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              {message ? <p className={styles.hint}>{message}</p> : null}

              <div className={styles.settingsActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? "保存中…" : "保存 AI 设置"}
                </button>
                <span className={styles.muted}>
                  密钥加密存库，仅显示后 4 位，不会回传明文。
                </span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
