"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import BrandPanel from "@/features/auth/components/BrandPanel";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useLiaoSwing } from "@/features/auth/hooks/useLiaoSwing";
import styles from "@/features/auth/auth-page.module.css";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { resetPassword } = useAuth();
  const liaoSwing = useLiaoSwing();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      <BrandPanel liaoSwing={liaoSwing} />

      <section className={styles.formSide}>
        <div className={styles.top}>
          <div className={styles.topIndex}>
            <span>
              <span className={styles.topIndexBold}>ZHAO</span>
              &nbsp;/&nbsp;FAMILY
            </span>
            <span>SECURE ACCESS</span>
          </div>

          <div className={styles.topLang}>
            <span>ZH / EN / FR</span>
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.kicker}>
            <span className={styles.kickerDot} aria-hidden="true" />
            <span>PASSWORD RESET</span>
          </div>

          <h1 className={styles.title}>
            重设你的
            <br />
            <span className={styles.titleZh}>访问密码</span>
          </h1>

          <p className={styles.lede}>
            使用邮件中的安全链接设置新密码。链接只用于本次操作，不会在页面中显示。
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                NEW PASSWORD · 新密码
              </span>
              <div className={styles.fieldRow}>
                <input
                  className={`${styles.fieldInput} ${styles.fieldInputMono}`}
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
                  className={styles.fieldAux}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "隐藏" : "显示"}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                CONFIRM PASSWORD · 确认密码
              </span>
              <input
                className={`${styles.fieldInput} ${styles.fieldInputMono}`}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                }}
                autoComplete="new-password"
                placeholder="Repeat new password"
              />
            </div>

            {error ? <p className={styles.formError}>{error}</p> : null}
            {message ? <p className={styles.formSuccess}>{message}</p> : null}

            <div className={styles.cta}>
              <button
                className={styles.ctaPrimary}
                type="submit"
                disabled={loading || Boolean(message)}
              >
                <span>{loading ? "更新中..." : "确认更新"}</span>
                <span className={styles.ctaArrow}>→</span>
              </button>
            </div>
          </form>
        </div>

        <div className={styles.bottom}>
          <div className={styles.bottomBlock}>
            <span>
              EST. <span className={styles.bottomBold}>2011</span>
            </span>
          </div>
          <div className={`${styles.bottomBlock} ${styles.bottomBlockRight}`}>
            <span className={styles.bottomLink}>
              ZHAO Plateforme · Accès sécurisé
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPageContent() {
  return (
    <Suspense fallback={<main className={styles.main}>加载中...</main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
