import {
  Platform,
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { authControlStyles } from "@/features/auth/AuthFormControls";
import { crossPlatformShadow } from "@/lib/platform";
import { scaleStyles } from "@/lib/responsive";

type StyleDefs = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Styles shared by the dashboard news readers (mandatory-read modal, selected
 * post reader). Spread into each screen's own `StyleSheet.create(scaleStyles(...))`.
 */
export const newsReaderStyleDefs = {
    attachmentBody: {
      flex: 1,
      gap: 5,
    },
    attachmentCard: {
      alignItems: "center",
      backgroundColor: "rgba(193, 22, 22, 0.05)",
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      marginTop: 18,
      padding: 14,
    },
    attachmentName: {
      color: authControlStyles.colors.ink,
      fontFamily: "serif",
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 21,
    },
    newsMetaText: {
      color: authControlStyles.colors.ink40,
      fontFamily: "monospace",
      fontSize: 10,
      letterSpacing: 1.1,
      textTransform: "uppercase",
    },
    newsReadMore: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    pdfWebView: {
      flex: 1,
    },
    readerBody: {
      gap: 8,
      marginTop: 18,
    },
    readerMetaGrid: {
      borderColor: "rgba(193, 22, 22, 0.12)",
      borderWidth: 1,
      gap: 8,
      marginTop: 16,
      padding: 12,
    },
    readerSummary: {
      color: authControlStyles.colors.ink60,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 10,
    },
    readerTitle: {
      color: authControlStyles.colors.ink,
      fontSize: 30,
      fontWeight: "600",
      lineHeight: 36,
      marginTop: 16,
    },
    stateText: {
      color: authControlStyles.colors.ink60,
      fontFamily: "serif",
      fontSize: 14,
      lineHeight: 21,
    },
    readerBodyImage: {
      backgroundColor: "rgba(255, 255, 255, 0.72)",
      borderColor: "rgba(193, 22, 22, 0.16)",
      borderWidth: 1,
      height: 260,
      marginVertical: 8,
      width: "100%",
    },
    readerBodyText: {
      color: authControlStyles.colors.ink,
      fontSize: 16,
      lineHeight: 25,
    },
    mandatoryNewsActions: {
      borderTopColor: "rgba(193, 22, 22, 0.16)",
      borderTopWidth: 1,
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    mandatoryNewsAttachmentImage: {
      backgroundColor: "rgba(255, 255, 255, 0.72)",
      borderColor: "rgba(193, 22, 22, 0.16)",
      borderWidth: 1,
      height: 220,
      width: "100%",
    },
    mandatoryNewsAttachmentPreview: {
      height: 220,
      marginTop: 18,
      width: "100%",
    },
    mandatoryNewsPdfPreview: {
      backgroundColor: "#f4f4f4",
      height: 360,
      marginTop: 18,
      overflow: "hidden",
      width: "100%",
    },
    mandatoryNewsConfirmButton: {
      alignItems: "center",
      backgroundColor: authControlStyles.colors.red,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
    },
    mandatoryNewsConfirmButtonDisabled: {
      opacity: 0.45,
    },
    mandatoryNewsConfirmButtonText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },
    mandatoryNewsContent: {
      gap: 12,
      paddingBottom: 32,
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    mandatoryNewsHeader: {
      borderBottomColor: "rgba(193, 22, 22, 0.16)",
      borderBottomWidth: 1,
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    mandatoryNewsHint: {
      color: authControlStyles.colors.ink40,
      fontSize: 13,
      lineHeight: 20,
    },
    mandatoryNewsKicker: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.1,
      textTransform: "uppercase",
    },
    mandatoryNewsSafeArea: {
      backgroundColor: "#ffffff",
      flex: 1,
    },
    mandatoryNewsScroll: {
      flex: 1,
    },
    newsMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    newsTag: {
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      color: authControlStyles.colors.red,
      fontSize: 12,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    newsTagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 18,
    },
    readConfirmationButton: {
      alignItems: "center",
      backgroundColor: authControlStyles.colors.red,
      minHeight: 44,
      paddingHorizontal: 14,
      justifyContent: "center",
    },
    readConfirmationButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
    readConfirmationCard: {
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderTopWidth: 1,
      gap: 10,
      marginTop: 18,
      paddingTop: 16,
    },
    readConfirmationText: {
      color: authControlStyles.colors.ink40,
      fontSize: 13,
      lineHeight: 20,
    },
    readStatusButton: {
      alignItems: "center",
      borderColor: "rgba(193, 22, 22, 0.28)",
      borderWidth: 1,
      minHeight: 40,
      paddingHorizontal: 12,
      justifyContent: "center",
    },
    readStatusButtonText: {
      color: authControlStyles.colors.red,
      fontSize: 13,
      fontWeight: "700",
    },
    readStatusCard: {
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderTopWidth: 1,
      gap: 10,
      marginTop: 18,
      paddingTop: 16,
    },
    readStatusDetails: {
      gap: 8,
    },
    readStatusPerson: {
      borderBottomColor: "rgba(193, 22, 22, 0.1)",
      borderBottomWidth: 1,
      gap: 3,
      paddingVertical: 9,
    },
    readStatusPersonMeta: {
      color: authControlStyles.colors.ink40,
      fontSize: 12,
    },
    readStatusPersonName: {
      color: authControlStyles.colors.ink,
      fontSize: 14,
      fontWeight: "600",
    },
    readStatusTab: {
      borderColor: "rgba(193, 22, 22, 0.2)",
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    readStatusTabActive: {
      backgroundColor: authControlStyles.colors.red,
    },
    readStatusTabText: {
      color: authControlStyles.colors.ink,
      fontSize: 12,
      fontWeight: "600",
    },
    readStatusTabTextActive: {
      color: "#ffffff",
    },
    readStatusTabs: {
      flexDirection: "row",
      gap: 8,
    },
    readerBackdrop: {
      backgroundColor: "rgba(10, 10, 10, 0.18)",
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    readerCloseButton: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(193, 22, 22, 0.18)",
      backgroundColor: "rgba(255,255,255,0.25)",
      minHeight: 34,
      paddingHorizontal: 14,
    },
    readerModalRoot: {
      ...StyleSheet.absoluteFillObject,
      flex: 1,
      justifyContent: "flex-end",
    },
    readerSafeArea: {
      backgroundColor: "transparent",
      bottom: 0,
      justifyContent: "flex-end",
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
      width: "100%",
    },
    readerScroll: {
      flexShrink: 1,
    },
    readerSheet: {
      backgroundColor: Platform.select({
        ios: "rgba(255, 255, 255, 0.88)",
        default: "rgba(255, 255, 255, 0.96)",
      }),
      borderColor: "rgba(193, 22, 22, 0.22)",
      borderTopWidth: 1,
      maxHeight: "82%",
      overflow: "hidden",
      paddingBottom: 18,
      paddingHorizontal: 20,
      paddingTop: 10,
      ...crossPlatformShadow({
        color: authControlStyles.colors.red,
        offset: { width: 0, height: -16 },
        opacity: 0.14,
        radius: 30,
        elevation: 24,
      }),
      width: "100%",
    },
    sheetCloseText: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.1,
    },
    sheetHandle: {
      alignSelf: "center",
      backgroundColor: "rgba(193, 22, 22, 0.16)",
      height: 4,
      marginBottom: 18,
      width: 42,
    },
    sheetSurface: {
      backgroundColor: Platform.select({
        ios: "rgba(255, 255, 255, 0.5)",
        default: "transparent",
      }),
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    stateRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
} satisfies StyleDefs;

export const newsReaderStyles = StyleSheet.create(scaleStyles(newsReaderStyleDefs));
