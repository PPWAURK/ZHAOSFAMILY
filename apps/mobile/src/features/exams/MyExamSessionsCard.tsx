import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { MyExamSession } from "@zhao/types";
import { pickExamText, type ExamContentLanguage } from "@zhao/utils";

import { fetchMyExamSessions } from "@/features/exams/examApi";
import type { ExamCopy } from "@/features/exams/examCopy";
import { examStyles as styles } from "@/features/exams/examStyles";

export const MY_EXAM_SESSIONS_QUERY_KEY = ["exams", "my-sessions"] as const;

export function sessionStateText(session: MyExamSession, copy: ExamCopy): string {
  const text = copy.mySessions;
  if (session.attemptStatus === "IN_PROGRESS") return text.inProgress;
  if (session.attemptStatus) return text.submitted;
  return session.status === "OPEN" ? text.open : text.waiting;
}

type MyExamSessionsCardProps = {
  isActive: boolean;
  copy: ExamCopy;
  language: ExamContentLanguage;
};

/** Exams the examiner registered me for. Renders nothing when there are none. */
export function MyExamSessionsCard({ isActive, copy, language }: MyExamSessionsCardProps) {
  const query = useQuery({
    queryKey: MY_EXAM_SESSIONS_QUERY_KEY,
    queryFn: fetchMyExamSessions,
    enabled: isActive,
  });
  if (!query.data?.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{copy.mySessions.title}</Text>
      <Text style={styles.muted}>{copy.mySessions.hint}</Text>
      {query.data.map((session) => (
        <View key={session.id} style={styles.metaRow}>
          <Text style={styles.cardTitle}>
            {pickExamText(language, session.template.titleZh, session.template.titleFr)}
          </Text>
          <Text style={styles.metaChip}>{sessionStateText(session, copy)}</Text>
          {session.startsAt ? (
            <Text style={styles.metaChip}>{new Date(session.startsAt).toLocaleString()}</Text>
          ) : null}
          <Text style={styles.metaChip}>{copy.mySessions.examiner(session.examiner.name)}</Text>
        </View>
      ))}
    </View>
  );
}
