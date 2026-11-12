import { StyleSheet } from "react-native";
import { scaleStyles } from "@/lib/responsive";
import { authControlStyles } from "@/features/auth/AuthFormControls";

export const trainingFolderStyles = StyleSheet.create(
  scaleStyles({
    grid: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    tile: {
      backgroundColor: "#ffffff",
      borderColor: authControlStyles.colors.ink10,
      borderWidth: 1,
      flexBasis: "47%",
      flexGrow: 1,
      minWidth: 0,
      padding: 14,
    },
    tileHead: {
      gap: 8,
    },
    tileOpen: {
      borderColor: authControlStyles.colors.red,
      flexBasis: "100%",
    },
    tilePressed: {
      opacity: 0.85,
    },
    tileTop: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    tileName: {
      color: authControlStyles.colors.ink,
      flex: 1,
      fontFamily: "serif",
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 20,
    },
    tileCount: {
      color: authControlStyles.colors.ink60,
      fontFamily: "monospace",
      fontSize: 11,
      letterSpacing: 0.5,
    },
    tileTrack: {
      backgroundColor: authControlStyles.colors.ink10,
      height: 3,
    },
    tileFill: {
      backgroundColor: authControlStyles.colors.red,
      height: 3,
    },
    panel: {
      gap: 10,
      paddingTop: 12,
    },
    toolbar: {
      alignItems: "center",
      flexDirection: "row",
      gap: 14,
      justifyContent: "flex-end",
    },
    toolbarAction: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 12,
      letterSpacing: 0.5,
      paddingVertical: 4,
    },
  }),
);
