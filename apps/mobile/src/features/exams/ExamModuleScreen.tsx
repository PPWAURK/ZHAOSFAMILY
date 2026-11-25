import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ExamAttempt, MyExamAttempt } from "@zhao/types";
import type { ExamContentLanguage } from "@zhao/utils";

import type { AuthLanguage } from "@/features/auth/authCopy";
import { EXAM_COPY } from "@/features/exams/examCopy";
import { ExamHistoryView } from "@/features/exams/ExamHistoryView";
import { ExamListView } from "@/features/exams/ExamListView";
import { ExamResultView } from "@/features/exams/ExamResultView";
import { ExamTakingView } from "@/features/exams/ExamTakingView";

type ExamModuleScreenProps = {
  isActive?: boolean;
  language: AuthLanguage;
  onDirtyStateChange?: (isDirty: boolean) => void;
};

export type ExamView =
  | { name: "list" }
  | { name: "history" }
  | { name: "take"; attemptId: number }
  | { name: "result"; attemptId: number };

const DATE_LOCALES: Record<AuthLanguage, string> = { zh: "zh-CN", en: "en-GB", fr: "fr-FR" };

/** Employee online exams: list → take (timed, autosaved) → result, plus history. */
export function ExamModuleScreen({
  isActive = true,
  language,
  onDirtyStateChange,
}: ExamModuleScreenProps) {
  const copy = EXAM_COPY[language];
  const contentLanguage: ExamContentLanguage = language === "zh" ? "zh" : "fr";
  const queryClient = useQueryClient();
  const [view, setView] = useState<ExamView>({ name: "list" });

  // Mid-exam the dashboard keeps this module mounted (dirty state), so switching
  // tabs does not drop the running attempt's answers or countdown.
  useEffect(() => {
    onDirtyStateChange?.(view.name === "take");
  }, [onDirtyStateChange, view.name]);

  const showResult = useCallback(
    (attempt: ExamAttempt) => {
      void queryClient.invalidateQueries({ queryKey: ["exams"] });
      setView({ name: "result", attemptId: attempt.id });
    },
    [queryClient],
  );
  const backToList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["exams"] });
    setView({ name: "list" });
  }, [queryClient]);
  const formatDate = useCallback(
    (value: string) =>
      new Intl.DateTimeFormat(DATE_LOCALES[language], {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value)),
    [language],
  );

  if (view.name === "take") {
    return (
      <ExamTakingView
        key={view.attemptId}
        attemptId={view.attemptId}
        copy={copy}
        defaultLanguage={contentLanguage}
        onFinished={showResult}
        onLeave={backToList}
      />
    );
  }
  if (view.name === "result") {
    return (
      <ExamResultView
        attemptId={view.attemptId}
        copy={copy}
        defaultLanguage={contentLanguage}
        onBack={backToList}
      />
    );
  }
  if (view.name === "history") {
    return (
      <ExamHistoryView
        copy={copy}
        language={contentLanguage}
        formatDate={formatDate}
        onBack={backToList}
        onOpen={(row: MyExamAttempt) =>
          setView(
            row.status === "IN_PROGRESS"
              ? { name: "take", attemptId: row.id }
              : { name: "result", attemptId: row.id },
          )
        }
      />
    );
  }
  return (
    <ExamListView
      isActive={isActive}
      copy={copy}
      language={contentLanguage}
      onStarted={(attempt) => setView({ name: "take", attemptId: attempt.id })}
      onOpenHistory={() => setView({ name: "history" })}
    />
  );
}
