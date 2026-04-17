"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (!token) return setError("Token manquant dans l'URL.");
    if (password.length < 8) return setError("Mot de passe d'au moins 8 caractères.");
    setLoading(true);
    try {
      await resetPassword(token, password);
      setMessage("✦ Mot de passe mis à jour. Redirection...");
      setTimeout(() => router.push("/"), 1200);
    } catch (err) {
      setError(err?.message || "Token invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "4rem", maxWidth: 480, margin: "0 auto" }}>
      <h1>重置密码 · Réinitialiser le mot de passe</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        <label>
          新密码 / Nouveau mot de passe (8+ caractères)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ width: "100%", padding: "0.6rem", marginTop: "0.3rem" }}
          />
        </label>
        {error && <p style={{ color: "#8C1414" }}>{error}</p>}
        {message && <p style={{ color: "#2e7d32" }}>{message}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.7rem",
            background: "#8C1414",
            color: "#FDF8F2",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {loading ? "Mise à jour..." : "更新 / Mettre à jour"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main style={{ padding: "4rem" }}>加载中...</main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
