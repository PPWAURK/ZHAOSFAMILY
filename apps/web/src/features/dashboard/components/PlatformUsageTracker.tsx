"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import { recordWebModuleOpen } from "@/features/dashboard/services/platformReportApi";

const MODULE_BY_ROUTE: Record<string, string> = {
  profile: "profile",
  training: "training",
  stores: "stores",
  orders: "orders",
  "recruitment-requests": "recruitment",
  "case-shares-review": "case-shares",
  "abc-scores": "abc-scores",
  suppliers: "suppliers",
  inventory: "inventory",
  permissions: "permissions",
  "screen-security": "screen-security",
  recipes: "recipes",
  titles: "training",
  reports: "reports",
};

function resolveUsageModule(pathname: string): string | null {
  if (!pathname.startsWith("/dashboard")) return null;
  const section = pathname.split("/")[2];
  return section ? (MODULE_BY_ROUTE[section] ?? null) : "dashboard";
}

export default function PlatformUsageTracker(): null {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastModuleKey = useRef<string | null>(null);

  useEffect(() => {
    const moduleName = resolveUsageModule(pathname);
    if (!user || !moduleName) return;

    const moduleKey = `${user.id}:${moduleName}`;
    if (lastModuleKey.current === moduleKey) return;

    lastModuleKey.current = moduleKey;
    void recordWebModuleOpen(moduleName);
  }, [pathname, user]);

  return null;
}
