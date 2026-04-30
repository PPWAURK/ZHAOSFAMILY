"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import SupplierDetailPage from "@/features/suppliers/pages/SupplierDetailPage";
import SuppliersListPage from "@/features/suppliers/pages/SuppliersListPage";

function SuppliersRouter() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <SupplierDetailPage supplierId={id} />;
  return <SuppliersListPage />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SuppliersRouter />
    </Suspense>
  );
}
