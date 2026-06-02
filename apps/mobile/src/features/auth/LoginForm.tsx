import { Pressable, View } from "react-native";
import {
  AuthTextField,
  MetaRow,
  TrackingText,
  authControlStyles,
} from "@/features/auth/AuthFormControls";
import type { AuthCopy } from "@/features/auth/authCopy";

type LoginFormProps = {
  copy: AuthCopy;
  email: string;
  isSubmittingForgotPassword: boolean;
  password: string;
  rememberDevice: boolean;
  showPassword: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onForgotPassword: () => void;
  onTogglePassword: () => void;
  onToggleRemember: () => void;
};

export function LoginForm({
  copy,
  email,
  isSubmittingForgotPassword,
  password,
  rememberDevice,
  showPassword,
  onChangeEmail,
  onChangePassword,
  onForgotPassword,
  onTogglePassword,
  onToggleRemember,
}: LoginFormProps) {
  return (
    <View>
      <AuthTextField
        autoComplete="email"
        keyboardType="email-address"
        label={copy.labelAccount}
        onChangeText={onChangeEmail}
        placeholder={copy.phEmail}
        value={email}
        withTopBorder
      />

      <AuthTextField
        autoComplete="password"
        label={copy.labelPassword}
        mono={!showPassword}
        onChangeText={onChangePassword}
        placeholder={copy.phPassword}
        rightAction={
          <Pressable onPress={onTogglePassword}>
            <TrackingText color={authControlStyles.colors.ink40} size={10.5}>
              {showPassword ? copy.hide : copy.show}
            </TrackingText>
          </Pressable>
        }
        secureTextEntry={!showPassword}
        value={password}
      />

      <MetaRow
        forgotLabel={isSubmittingForgotPassword ? copy.forgotSubmitting : copy.forgot}
        isSubmittingForgotPassword={isSubmittingForgotPassword}
        rememberDevice={rememberDevice}
        rememberLabel={copy.remember}
        onForgotPassword={onForgotPassword}
        onToggleRemember={onToggleRemember}
      />
    </View>
  );
}
