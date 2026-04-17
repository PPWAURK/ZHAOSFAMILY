"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <main style={{ padding: "4rem", textAlign: "center" }}>加载中...</main>
    );
  }

  return (
    <main style={{ padding: "4rem", maxWidth: 720, margin: "0 auto" }}>
      <h1>欢迎，{user.name}</h1>
      <p style={{ opacity: 0.7 }}>
        {user.email} · {user.role}
      </p>
      <p style={{ marginTop: "2rem" }}>
        Tableau de bord ZHAO's Family — les modules métier (restaurants, menus,
        stocks…) seront ajoutés ici en V2+.
      </p>
      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push("/");
        }}
        style={{
          marginTop: "2rem",
          padding: "0.6rem 1.4rem",
          background: "#8C1414",
          color: "#FDF8F2",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        退出登录
      </button>
    </main>
  );
}
