"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

function AcceptInvitationForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { acceptInvitation } = useAuth();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Token d'invitation manquant dans l'URL.");
      return;
    }
    if (!name.trim()) return setError("Nom requis.");
    if (password.length < 8) return setError("Mot de passe d'au moins 8 caractères.");
    setLoading(true);
    try {
      await acceptInvitation(token, name, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Invitation invalide.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "4rem", maxWidth: 480, margin: "0 auto" }}>
      <h1>接受邀请 · Accepter l&apos;invitation</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        <label>
          姓名 / Nom
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            style={{ width: "100%", padding: "0.6rem", marginTop: "0.3rem" }}
          />
        </label>
        <label>
          密码 / Mot de passe (8+ caractères)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ width: "100%", padding: "0.6rem", marginTop: "0.3rem" }}
          />
        </label>
        {error && <p style={{ color: "#8C1414" }}>{error}</p>}
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
          {loading ? "Création..." : "创建账号 / Créer le compte"}
        </button>
      </form>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<main style={{ padding: "4rem" }}>加载中...</main>}>
      <AcceptInvitationForm />
    </Suspense>
  );
}
