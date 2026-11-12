import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import type { DashboardNewsPost } from "@/features/dashboard/dashboardNewsApi";
import { createDashboardNewsPdfViewer } from "@/features/dashboard/dashboardNewsPdfPreview";
import { newsPdfPreviewStyles as styles } from "@/features/dashboard/newsPdfPreviewStyles";

const PDF_LOADING_MIN_DURATION_MS = 2000;

export interface NewsPdfPreviewCopy {
  newsPdfPreview: string;
  newsPdfPreviewError: string;
  newsPdfPreviewLoading: string;
  newsReaderClose: string;
}

export interface NewsPdfPreviewHandle {
  open: (post: DashboardNewsPost) => Promise<void>;
  close: () => void;
}

interface NewsPdfPreviewModalProps {
  copy: NewsPdfPreviewCopy;
  userId: number | string;
}

interface PreviewState {
  baseUri: string | null;
  error: string;
  fileUri: string | null;
  isLoading: boolean;
  post: DashboardNewsPost | null;
}

const CLOSED_STATE: PreviewState = {
  baseUri: null,
  error: "",
  fileUri: null,
  isLoading: false,
  post: null,
};

/**
 * Owns the PDF preview state so loading progress re-renders only this modal,
 * not the whole dashboard. The parent drives it through the ref (`open` / `close`).
 */
export const NewsPdfPreviewModal = forwardRef<NewsPdfPreviewHandle, NewsPdfPreviewModalProps>(
  function NewsPdfPreviewModal({ copy, userId }, ref) {
    const [state, setState] = useState<PreviewState>(CLOSED_STATE);
    const loadingStartedAtRef = useRef(0);
    const loadingTokenRef = useRef(0);

    const close = useCallback((): void => {
      loadingStartedAtRef.current = 0;
      loadingTokenRef.current += 1;
      setState(CLOSED_STATE);
    }, []);

    // Keeps the spinner visible for a minimum time so it does not flash.
    const finishLoading = useCallback((onFinish?: () => void): void => {
      const token = loadingTokenRef.current;
      const elapsed = Date.now() - loadingStartedAtRef.current;
      const remaining = Math.max(0, PDF_LOADING_MIN_DURATION_MS - elapsed);

      setTimeout(() => {
        if (token !== loadingTokenRef.current) return;

        setState((current) => ({ ...current, isLoading: false }));
        onFinish?.();
      }, remaining);
    }, []);

    const showError = useCallback((): void => {
      setState((current) => ({ ...current, error: copy.newsPdfPreviewError }));
    }, [copy.newsPdfPreviewError]);

    const open = useCallback(
      async (post: DashboardNewsPost): Promise<void> => {
        const attachment = post.attachment;
        if (!attachment) return;

        loadingStartedAtRef.current = Date.now();
        loadingTokenRef.current += 1;
        const token = loadingTokenRef.current;
        setState({ ...CLOSED_STATE, isLoading: true, post });

        try {
          const viewer = await createDashboardNewsPdfViewer(attachment, userId);

          if (token !== loadingTokenRef.current) return;

          setState((current) => ({
            ...current,
            baseUri: viewer.baseUri,
            fileUri: viewer.fileUri,
          }));
        } catch {
          finishLoading(showError);
        }
      },
      [finishLoading, showError, userId],
    );

    useImperativeHandle(ref, () => ({ close, open }), [close, open]);

    return (
      <Modal
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        visible={state.post !== null}
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <View style={styles.attachmentBody}>
                <Text style={styles.metaText}>{copy.newsPdfPreview}</Text>
                <Text style={styles.attachmentName}>
                  {state.post?.attachment?.name || "-"}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={close}>
                <Text style={styles.closeText}>{copy.newsReaderClose}</Text>
              </Pressable>
            </View>
            <View style={styles.viewer}>
              {state.post && state.fileUri ? (
                <WebView
                  allowFileAccess
                  allowFileAccessFromFileURLs
                  allowingReadAccessToURL={state.baseUri || state.fileUri}
                  mixedContentMode="always"
                  originWhitelist={["*"]}
                  source={{ uri: state.fileUri }}
                  startInLoadingState
                  style={styles.webView}
                  onError={() => finishLoading(showError)}
                  onLoadEnd={() => finishLoading()}
                />
              ) : null}
              {state.isLoading ? (
                <View style={styles.loadingOverlay}>
                  <ZhaoLoadingIndicator label={copy.newsPdfPreviewLoading} variant="overlay" />
                </View>
              ) : null}
              {state.error ? (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>{state.error}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    );
  },
);
