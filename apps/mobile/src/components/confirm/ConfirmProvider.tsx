import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

type DialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "default" | "danger";
};

const ConfirmContext = createContext<ConfirmFn | null>(null);

const DEFAULT_CONFIRM_LABEL = "确认";
const DEFAULT_CANCEL_LABEL = "取消";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const config: ConfirmOptions =
      typeof options === "string" ? { message: options } : options;

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: config.title ?? "",
        message: config.message,
        confirmLabel: config.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
        cancelLabel: config.cancelLabel ?? DEFAULT_CANCEL_LABEL,
        tone: config.tone ?? "default",
      });
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    setDialog(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => settle(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => settle(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            {dialog?.title ? (
              <Text style={styles.title}>{dialog.title}</Text>
            ) : null}
            <Text style={styles.message}>{dialog?.message}</Text>

            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => settle(false)}
              >
                <Text style={styles.cancelLabel}>{dialog?.cancelLabel}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.confirmButton]}
                onPress={() => settle(true)}
              >
                <Text style={styles.confirmLabel}>{dialog?.confirmLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 10, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#c11616",
    padding: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0a0a0a",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(10, 10, 10, 0.7)",
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(10, 10, 10, 0.2)",
  },
  cancelLabel: {
    fontSize: 13,
    color: "rgba(10, 10, 10, 0.8)",
  },
  confirmButton: {
    backgroundColor: "#c11616",
    borderColor: "#c11616",
  },
  confirmLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
});
