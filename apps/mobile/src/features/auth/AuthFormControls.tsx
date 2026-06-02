import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import type { AuthCopy, AuthLanguage } from "@/features/auth/authCopy";
import { LANGUAGE_OPTIONS } from "@/features/auth/authCopy";

const COLORS = {
  red: "#c11616",
  redDeep: "#8c1414",
  ink: "#0a0a0a",
  ink60: "rgba(10, 10, 10, 0.6)",
  ink40: "rgba(10, 10, 10, 0.4)",
  ink20: "rgba(10, 10, 10, 0.2)",
  ink10: "rgba(10, 10, 10, 0.1)",
  ink05: "rgba(10, 10, 10, 0.05)",
  paper: "#ffffff",
  success: "#197a3d",
};

type TrackingTextProps = {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: object;
};
export function TrackingText({
  children,
  color = COLORS.ink40,
  size = 11,
  style,
}: TrackingTextProps) {
  return (
    <Text
      style={[
        styles.trackingText,
        {
          color,
          fontSize: size,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type TopIndexProps = {
  activeStage: string;
  copy: AuthCopy;
  language: AuthLanguage;
  onChangeLanguage: (language: AuthLanguage) => void;
};
export function TopIndex({
  activeStage,
  copy,
  language,
  onChangeLanguage,
}: TopIndexProps) {
  return (
    <View style={styles.top}>
      <View style={styles.topIndex}>
        <Text style={styles.topIndexText}>
          <Text style={styles.topIndexBold}>ZHAO</Text> / {copy.topFamily}
        </Text>
        <Text style={styles.topIndexText}>{activeStage}</Text>
      </View>

      <View style={styles.languageRow}>
        {LANGUAGE_OPTIONS.map((option, index) => (
          <View key={option.value} style={styles.languageItem}>
            {index > 0 ? <Text style={styles.languageSep}>/</Text> : null}
            <Pressable onPress={() => onChangeLanguage(option.value)}>
              <Text
                style={[
                  styles.languageText,
                  language === option.value ? styles.languageActive : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

type AuthHeadingProps = {
  kicker: string;
  lede: string;
  title: [string, string, string, string];
};
export function AuthHeading({ kicker, lede, title }: AuthHeadingProps) {
  return (
    <View>
      <View style={styles.kicker}>
        <View style={styles.kickerDot} />
        <TrackingText>{kicker}</TrackingText>
      </View>

      <Text style={styles.title}>
        {title[0]}
        <Text style={styles.titleEm}>{title[1]}</Text>
        {title[2]}
        {"\n"}
        <Text style={styles.titleZh}>{title[3]}</Text>
      </Text>

      <Text style={styles.lede}>{lede}</Text>
    </View>
  );
}

type AuthTextFieldProps = TextInputProps & {
  label: string;
  mono?: boolean;
  rightAction?: ReactNode;
  withTopBorder?: boolean;
};
export function AuthTextField({
  label,
  mono = false,
  rightAction,
  style,
  withTopBorder = false,
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <View style={[styles.field, withTopBorder ? styles.fieldTop : null]}>
      <View style={styles.fieldRow}>
        <View style={styles.fieldCol}>
          <TrackingText size={10.5} style={styles.fieldLabel}>
            {label}
          </TrackingText>
          <TextInput
            {...inputProps}
            autoCapitalize={inputProps.autoCapitalize ?? "none"}
            placeholderTextColor={COLORS.ink20}
            style={[styles.fieldInput, mono ? styles.fieldInputMono : null, style]}
          />
        </View>
        {rightAction}
      </View>
    </View>
  );
}

type CheckboxRowProps = {
  checked: boolean;
  label: string;
  onToggle: () => void;
};
export function CheckboxRow({ checked, label, onToggle }: CheckboxRowProps) {
  return (
    <Pressable style={styles.checkRow} onPress={onToggle}>
      <View style={[styles.checkBox, checked ? styles.checkBoxActive : null]}>
        {checked ? <View style={styles.checkBoxInner} /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

type MetaRowProps = {
  forgotLabel: string;
  isSubmittingForgotPassword: boolean;
  rememberDevice: boolean;
  rememberLabel: string;
  onForgotPassword: () => void;
  onToggleRemember: () => void;
};
export function MetaRow({
  forgotLabel,
  isSubmittingForgotPassword,
  rememberDevice,
  rememberLabel,
  onForgotPassword,
  onToggleRemember,
}: MetaRowProps) {
  return (
    <View style={styles.meta}>
      <CheckboxRow checked={rememberDevice} label={rememberLabel} onToggle={onToggleRemember} />

      <Pressable disabled={isSubmittingForgotPassword} onPress={onForgotPassword}>
        <Text
          style={[
            styles.forgot,
            isSubmittingForgotPassword ? styles.forgotDisabled : null,
          ]}
        >
          {forgotLabel}
        </Text>
      </Pressable>
    </View>
  );
}

type FeedbackMessageProps = {
  children: ReactNode;
  tone: "error" | "success";
};

export function FeedbackMessage({ children, tone }: FeedbackMessageProps) {
  return (
    <Text style={[styles.feedback, tone === "success" ? styles.feedbackSuccess : null]}>
      {children}
    </Text>
  );
}

type PrimaryButtonProps = {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
};

export function PrimaryButton({
  disabled = false,
  isLoading = false,
  label,
  onPress,
}: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled || isLoading}
      style={[styles.primaryButton, disabled || isLoading ? styles.primaryButtonDisabled : null]}
      onPress={onPress}
    >
      {isLoading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{label}</Text>
          <Text style={styles.primaryArrow}>→</Text>
        </>
      )}
    </Pressable>
  );
}

type SwitchLineProps = {
  actionLabel: string;
  hint: string;
  onPress: () => void;
};

export function SwitchLine({ actionLabel, hint, onPress }: SwitchLineProps) {
  return (
    <View style={styles.switchLine}>
      <Text style={styles.switchHint}>{hint}</Text>
      <Pressable onPress={onPress}>
        <Text style={styles.switchAction}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export const authControlStyles = {
  colors: COLORS,
};

const styles = StyleSheet.create({
  checkBox: {
    borderColor: COLORS.ink,
    borderWidth: 1,
    height: 14,
    justifyContent: "center",
    width: 14,
  },
  checkBoxActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  checkBoxInner: {
    backgroundColor: COLORS.paper,
    bottom: 3,
    left: 3,
    position: "absolute",
    right: 3,
    top: 3,
  },
  checkLabel: {
    color: COLORS.ink60,
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  checkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 34,
  },
  feedback: {
    color: COLORS.red,
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.6,
    lineHeight: 17,
    marginTop: 14,
  },
  feedbackSuccess: {
    color: COLORS.success,
  },
  field: {
    borderBottomColor: COLORS.ink,
    borderBottomWidth: 1,
    paddingBottom: 12,
    paddingTop: 22,
  },
  fieldCol: {
    flex: 1,
    minWidth: 0,
  },
  fieldInput: {
    color: COLORS.ink,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "400",
    minHeight: 38,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  fieldInputMono: {
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  fieldRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
  },
  fieldTop: {
    borderTopColor: COLORS.ink,
    borderTopWidth: 1,
  },
  forgot: {
    borderBottomColor: COLORS.ink,
    borderBottomWidth: 1,
    color: COLORS.ink,
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.6,
    paddingBottom: 1,
  },
  forgotDisabled: {
    borderBottomColor: COLORS.ink20,
    color: COLORS.ink40,
  },
  kicker: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  kickerDot: {
    backgroundColor: COLORS.red,
    height: 6,
    width: 6,
  },
  languageActive: {
    color: COLORS.red,
  },
  languageItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  languageRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  languageSep: {
    color: COLORS.ink20,
    fontFamily: "monospace",
    fontSize: 11,
  },
  languageText: {
    color: COLORS.ink40,
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  lede: {
    color: COLORS.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
    maxWidth: 420,
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  primaryArrow: {
    color: COLORS.paper,
    fontFamily: "monospace",
    fontSize: 22,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.red,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    minHeight: 68,
    paddingHorizontal: 28,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(193, 22, 22, 0.36)",
  },
  primaryButtonText: {
    color: COLORS.paper,
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0.6,
  },
  switchAction: {
    borderBottomColor: COLORS.ink,
    borderBottomWidth: 1,
    color: COLORS.ink,
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 0.6,
    paddingBottom: 1,
  },
  switchHint: {
    color: COLORS.ink40,
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  switchLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
  },
  title: {
    color: COLORS.ink,
    fontFamily: "serif",
    fontSize: 48,
    fontWeight: "400",
    lineHeight: 50,
    marginBottom: 16,
  },
  titleEm: {
    color: COLORS.red,
    fontFamily: "serif",
    fontStyle: "italic",
    fontWeight: "400",
  },
  titleZh: {
    fontFamily: "serif",
    fontWeight: "500",
  },
  top: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topIndex: {
    gap: 8,
  },
  topIndexBold: {
    color: COLORS.ink,
  },
  topIndexText: {
    color: COLORS.ink40,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
  },
  trackingText: {
    fontFamily: "monospace",
    fontWeight: "500",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
});
