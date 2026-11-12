import { StyleSheet } from "react-native";

import { authControlStyles } from "@/features/auth/AuthFormControls";
import { scaleStyles } from "@/lib/responsive";

export const newsPdfPreviewStyles = StyleSheet.create(
  scaleStyles({
    attachmentBody: {
      flex: 1,
      gap: 5,
    },
    attachmentName: {
      color: authControlStyles.colors.ink,
      fontFamily: "serif",
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 21,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.25)",
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 34,
      paddingHorizontal: 14,
    },
    closeText: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.1,
    },
    header: {
      alignItems: "center",
      borderBottomColor: "rgba(193, 22, 22, 0.14)",
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 14,
      justifyContent: "space-between",
      padding: 16,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      gap: 18,
      justifyContent: "center",
      padding: 24,
    },
    loadingText: {
      color: authControlStyles.colors.red,
      fontFamily: "serif",
      fontSize: 22,
      fontWeight: "600",
      lineHeight: 30,
      textAlign: "center",
    },
    metaText: {
      color: authControlStyles.colors.ink40,
      fontFamily: "monospace",
      fontSize: 10,
      letterSpacing: 1.1,
      textTransform: "uppercase",
    },
    modalRoot: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(10, 10, 10, 0.22)",
      justifyContent: "flex-end",
    },
    panel: {
      backgroundColor: "#ffffff",
      borderColor: "rgba(193, 22, 22, 0.22)",
      borderTopWidth: 1,
      height: "88%",
      overflow: "hidden",
      width: "100%",
    },
    viewer: {
      flex: 1,
      position: "relative",
    },
    webView: {
      flex: 1,
    },
  }),
);
