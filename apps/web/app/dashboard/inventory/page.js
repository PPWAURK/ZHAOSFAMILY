"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import InventoryPage from "@/features/inventory/pages/InventoryPage";

function InventoryRouter() {
  const params = useSearchParams();
  const raw = params.get("supplierId");
  const parsed = raw ? Number(raw) : null;
  const supplierId = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  return <InventoryPage supplierId={supplierId} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InventoryRouter />
    </Suspense>
  );
}
