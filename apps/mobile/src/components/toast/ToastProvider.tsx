import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ToastTone = "success" | "error" | "info";

type ToastOptions = {
  tone?: ToastTone;
  duration?: number;
};

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  show: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      if (!message) {
        return;
      }

      const id = (idRef.current += 1);
      const duration = options.duration ?? DEFAULT_DURATION;

      setToasts((current) => [
        ...current,
        { id, message, tone: options.tone ?? "info" },
      ]);

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
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
      {toasts.length > 0 ? (
        <SafeAreaView style={styles.viewport} pointerEvents="box-none">
          {toasts.map((toast) => (
            <Pressable
              key={toast.id}
              style={[styles.toast, toneStyles[toast.tone]]}
              onPress={() => dismiss(toast.id)}
            >
              <Text style={styles.message}>{toast.message}</Text>
            </Pressable>
          ))}
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    gap: 10,
  },
  toast: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(10, 10, 10, 0.15)",
    borderLeftWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: "#0a0a0a",
  },
});

const toneStyles = StyleSheet.create({
  success: { borderLeftColor: "#1f8a4c" },
  error: { borderLeftColor: "#c11616" },
  info: { borderLeftColor: "#0a0a0a" },
});
