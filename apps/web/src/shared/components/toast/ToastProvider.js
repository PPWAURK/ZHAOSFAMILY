"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import ToastViewport from "@/shared/components/toast/ToastViewport";

const ToastContext = createContext(null);

const DEFAULT_DURATION = 3500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message, options = {}) => {
      if (!message) {
        return -1;
      }

      const id = (idRef.current += 1);
      const duration = options.duration ?? DEFAULT_DURATION;

      setToasts((current) => [
        ...current,
        { id, message, tone: options.tone ?? "info" },
      ]);

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, tone: "success" }),
      error: (message, options) => show(message, { ...options, tone: "error" }),
      info: (message, options) => show(message, { ...options, tone: "info" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
