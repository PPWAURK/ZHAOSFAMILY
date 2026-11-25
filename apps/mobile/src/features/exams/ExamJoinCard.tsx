import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { ExamAttempt } from "@zhao/types";

import { FeedbackPressable } from "@/components/FeedbackPressable";
import { joinExamSession } from "@/features/exams/examApi";
import { describeExamError, type ExamCopy } from "@/features/exams/examCopy";
import { examColors, examStyles as styles } from "@/features/exams/examStyles";

const CODE_LENGTH = 6;

/** Keeps digits only, at most six. */
export function normalizeSessionCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

type ExamJoinCardProps = {
  copy: ExamCopy;
  onJoined: (attempt: ExamAttempt) => void;
};

/** Employees type the examiner's 6-digit code to enter a proctored session. */
export function ExamJoinCard({ copy, onJoined }: ExamJoinCardProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const isComplete = code.length === CODE_LENGTH;

  const join = async () => {
    if (!isComplete || isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      onJoined(await joinExamSession(code));
    } catch (reason) {
      setError(describeExamError(reason, copy));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <View style={styles.joinCard}>
      <Text style={styles.cardTitle}>{copy.join.title}</Text>
      <Text style={styles.muted}>{copy.join.hint}</Text>
      <View style={styles.joinRow}>
        <TextInput
          accessibilityLabel={copy.join.title}
          value={code}
          onChangeText={(value) => setCode(normalizeSessionCode(value))}
          onSubmitEditing={() => void join()}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          placeholder="000000"
          placeholderTextColor={examColors.ink20}
          returnKeyType="go"
          textContentType="oneTimeCode"
          style={styles.joinInput}
        />
        <FeedbackPressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !isComplete || isJoining }}
          disabled={!isComplete || isJoining}
          onPress={() => void join()}
          style={[styles.primaryButton, (!isComplete || isJoining) && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {isJoining ? copy.join.joining : copy.join.button}
          </Text>
        </FeedbackPressable>
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
