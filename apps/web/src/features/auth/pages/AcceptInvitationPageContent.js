"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import styles from "@/features/auth/auth-action-page.module.css";

function AcceptInvitationForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { acceptInvitation } = useAuth();

  const [familyName, setFamilyName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function buildFullName() {
    return `${familyName.trim()}${givenName.trim()}`.trim();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Token d'invitation manquant dans l'URL.");
      return;
    }

    if (!familyName.trim()) {
      setError("姓不能为空。");
      return;
    }

    if (!givenName.trim()) {
      setError("名不能为空。");
      return;
    }

    if (password.length < 8) {
      setError("Mot de passe d'au moins 8 caractères.");
      return;
    }

    setLoading(true);

    try {
      await acceptInvitation(token, buildFullName(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Invitation invalide.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>接受邀请 · Accepter l&apos;invitation</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>姓 / Nom de famille</span>
            <input
              className={styles.input}
              type="text"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              autoComplete="family-name"
            />
          </label>

          <label className={styles.field}>
            <span>名 / Prenom</span>
            <input
              className={styles.input}
              type="text"
              value={givenName}
              onChange={(event) => setGivenName(event.target.value)}
              autoComplete="given-name"
            />
          </label>

          <label className={styles.field}>
            <span>密码 / Mot de passe (8+ caractères)</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          {error ? <p className={`${styles.message} ${styles.error}`}>{error}</p> : null}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Création..." : "创建账号 / Créer le compte"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function AcceptInvitationPageContent() {
  return (
    <Suspense fallback={<main className={styles.loading}>加载中...</main>}>
      <AcceptInvitationForm />
    </Suspense>
  );
}
