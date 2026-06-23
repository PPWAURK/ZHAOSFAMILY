"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import ConfirmDialog from "@/shared/components/confirm/ConfirmDialog";

const ConfirmContext = createContext(null);

const LANGUAGE_STORAGE_KEY = "zhao_preferred_language";

const DEFAULT_LABELS = {
  zh: { confirm: "确认", cancel: "取消" },
  en: { confirm: "Confirm", cancel: "Cancel" },
  fr: { confirm: "Confirmer", cancel: "Annuler" },
};

function readDefaultLabels() {
  if (typeof window === "undefined") {
    return DEFAULT_LABELS.zh;
  }

  const lang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return DEFAULT_LABELS[lang] ?? DEFAULT_LABELS.zh;
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const config = typeof options === "string" ? { message: options } : options || {};
    const labels = readDefaultLabels();

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: config.title ?? "",
        message: config.message ?? "",
        confirmLabel: config.confirmLabel ?? labels.confirm,
        cancelLabel: config.cancelLabel ?? labels.cancel,
        tone: config.tone ?? "default",
      });
    });
  }, []);

  const settle = useCallback((result) => {
    setDialog(null);

    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={Boolean(dialog)}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        tone={dialog?.tone}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }

  return context.confirm;
}
