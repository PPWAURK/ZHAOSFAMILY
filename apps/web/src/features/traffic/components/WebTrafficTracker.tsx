"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { API_URL } from "@/shared/api/api-client";

const VISITOR_ID_STORAGE_KEY = "zhao_web_traffic_visitor_id";

function getVisitorId(): string | null {
  const storedId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (storedId) {
    return storedId;
  }

  if (!window.crypto?.randomUUID) {
    return null;
  }

  const visitorId = window.crypto.randomUUID();
  localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);

  return visitorId;
}

export function WebTrafficTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) {
      return;
    }

    void fetch(`${API_URL}/traffic/pageviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
      keepalive: true,
    }).catch(() => {
      // Traffic telemetry must never affect website navigation or login.
    });
  }, [pathname]);

  return null;
}
