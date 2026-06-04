"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import styles from "@/features/auth/auth-action-page.module.css";

function getPasswordStrength(password) {
  if (!password) return { label: "等待输入 · Waiting", score: 0 };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 4) return { label: "强 · Fort", score };
  if (score >= 2) return { label: "中 · Moyen", score };
  return { label: "弱 · Faible", score };
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const redirectTimeoutId = window.setTimeout(() => {
      router.push("/");
    }, 1200);

    return () => window.clearTimeout(redirectTimeoutId);
  }, [message, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Token manquant dans l'URL.");
      return;
    }

    if (password.length < 8) {
      setError("请输入至少 8 位的新密码。Mot de passe d'au moins 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setMessage("密码已更新。Mot de passe mis a jour. Redirection...");
    } catch (err) {
      setError(err?.message || "Token invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-label="ZHAO's Family">
        <div className={styles.brandTop}>
          <span>ZHAO</span>
          <span>SECURE ACCESS</span>
        </div>
        <div className={styles.brandMark}>
          <Image
            alt="ZHAO's Family"
            className={styles.logo}
            height={220}
            priority
            src="/logo2024/logo2024竖版.jpg"
            width={220}
          />
        </div>
        <div className={styles.brandCopy}>
          <p className={styles.kicker}>PASSWORD RESET</p>
          <h1>重设你的内部平台访问密码。</h1>
          <p>
            使用邮件中的安全链接设置新密码。链接只用于本次操作，不会在页面中显示。
          </p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.topLine}>
          <span>01 / ZHAO'S FAMILY</span>
          <span>ZH / EN / FR</span>
        </div>

        <div className={styles.formWrap}>
          <div className={styles.headingRow}>
            <div>
              <p className={styles.kicker}>SECURITY CHECK</p>
              <h2 className={styles.title}>重置密码</h2>
              <p className={styles.subtitle}>Reset password · Reinitialiser le mot de passe</p>
            </div>
            <Image
              alt=""
              className={styles.squareLogo}
              height={58}
              src="/logo2024/logozhao正方形.jpg"
              width={58}
            />
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>NEW PASSWORD · 新密码</span>
              <div className={styles.passwordRow}>
                <input
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  placeholder="8+ characters"
                />
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "隐藏" : "显示"}
                </button>
              </div>
            </label>

            <div className={styles.strength}>
              <span>强度 / Strength</span>
              <div className={styles.strengthTrack} aria-hidden="true">
                {[1, 2, 3, 4].map((item) => (
                  <i
                    key={item}
                    className={item <= strength.score ? styles.strengthActive : undefined}
                  />
                ))}
              </div>
              <strong>{strength.label}</strong>
            </div>

            <label className={styles.field}>
              <span>CONFIRM PASSWORD · 确认密码</span>
              <input
                className={styles.input}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                }}
                autoComplete="new-password"
                placeholder="Repeat new password"
              />
            </label>

            {error ? <p className={`${styles.message} ${styles.error}`}>{error}</p> : null}
            {message ? <p className={`${styles.message} ${styles.success}`}>{message}</p> : null}

            <button className={styles.button} type="submit" disabled={loading || Boolean(message)}>
              <span>{loading ? "更新中..." : "确认更新"}</span>
              <span>→</span>
            </button>
          </form>

          <p className={styles.notice}>
            如果链接已过期，请回到登录页重新发送重置邮件。旧密码不会被邮件系统读取或显示。
          </p>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPageContent() {
  return (
    <Suspense fallback={<main className={styles.loading}>加载中...</main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
