"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { canSeeNavEntry } from "@zhao/utils";

import { useAuth } from "@/features/auth/context/AuthContext";
import SupplierDetailPage from "@/features/suppliers/pages/SupplierDetailPage";
import SuppliersListPage from "@/features/suppliers/pages/SuppliersListPage";

const SUPPLIER_MANAGEMENT_ACCESS = {
  visibleForJobRoles: ["holding"],
};

function AccessMessage({ title, detail }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#211a14",
        background: "#fff",
      }}
    >
      <section style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ margin: "0 0 10px", fontSize: 24 }}>{title}</h1>
        <p style={{ margin: 0, color: "rgba(33, 26, 20, 0.68)" }}>{detail}</p>
      </section>
    </main>
  );
}

function SuppliersRouter() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <SupplierDetailPage supplierId={id} />;
  return <SuppliersListPage />;
}

export default function Page() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AccessMessage
        title="正在确认权限..."
        detail="请稍候，系统正在检查当前账号权限。"
      />
    );
  }

  if (!canSeeNavEntry(user || {}, SUPPLIER_MANAGEMENT_ACCESS)) {
    return (
      <AccessMessage
        title="无权限访问供应商管理"
        detail="该页面仅总部最高管理员可访问。"
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <SuppliersRouter />
    </Suspense>
  );
}
