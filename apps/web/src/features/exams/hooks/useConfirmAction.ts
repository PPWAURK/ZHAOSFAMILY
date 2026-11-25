"use client";

import { useConfirm } from "@/shared/components/confirm/ConfirmProvider";

type ConfirmOptions = { title?: string; message: string; tone?: "danger" };

/** Typed wrapper around the app-wide confirm dialog (a JS module). */
export function useConfirmAction(): (options: ConfirmOptions) => Promise<boolean> {
  const confirm = useConfirm() as (options: ConfirmOptions) => Promise<boolean>;
  return confirm;
}
