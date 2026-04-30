"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import styles from "@/features/auth/auth-action-page.module.css";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
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
      setError("Mot de passe d'au moins 8 caractères.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setMessage("✦ Mot de passe mis à jour. Redirection...");
    } catch (err) {
      setError(err?.message || "Token invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>重置密码 · Réinitialiser le mot de passe</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>新密码 / Nouveau mot de passe (8+ caractères)</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          {error ? <p className={`${styles.message} ${styles.error}`}>{error}</p> : null}
          {message ? <p className={`${styles.message} ${styles.success}`}>{message}</p> : null}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Mise à jour..." : "更新 / Mettre à jour"}
          </button>
        </form>
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
