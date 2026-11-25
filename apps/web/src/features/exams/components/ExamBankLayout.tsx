"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";

import { EXAM_BANK_COPY, type ExamBankCopy } from "../constants/exam-bank-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { hasExamPermission, type ExamPermission } from "../utils/examAccess";
import ExamShell from "./ExamShell";

export type ExamBankTab = keyof ExamBankCopy["tabs"];

const TABS: Array<{ id: ExamBankTab; href: string; permission: ExamPermission }> = [
  { id: "overview", href: "/dashboard/exam-bank", permission: "exam.bank.manage" },
  { id: "knowledge", href: "/dashboard/exam-bank/knowledge", permission: "exam.bank.manage" },
  { id: "generation", href: "/dashboard/exam-bank/generation", permission: "exam.bank.manage" },
  { id: "review", href: "/dashboard/exam-bank/review", permission: "exam.bank.manage" },
  { id: "templates", href: "/dashboard/exam-bank/templates", permission: "exam.bank.manage" },
  { id: "results", href: "/dashboard/exam-bank/results", permission: "exam.result.view" },
];

type ExamBankLayoutProps = {
  active: ExamBankTab;
  subtitle: (copy: ExamBankCopy) => string;
  permission?: ExamPermission;
  children: (context: { lang: ExamUiLanguage; copy: ExamBankCopy }) => ReactNode;
};

/** Admin shell: tab bar + page-level permission check (the menu entry alone is not a guard). */
export default function ExamBankLayout({
  active,
  subtitle,
  permission = "exam.bank.manage",
  children,
}: ExamBankLayoutProps) {
  const { user, isLoading } = useAuth();
  const [lang, setLang] = useExamLanguage();
  const copy = EXAM_BANK_COPY[lang];
  const isAllowed = hasExamPermission(user, permission);
  const visibleTabs = TABS.filter((tab) => hasExamPermission(user, tab.permission));

  return (
    <ExamShell
      lang={lang}
      onLanguageChange={setLang}
      kicker={copy.kicker}
      title={copy.title}
      subtitle={subtitle(copy)}
    >
      <nav className={styles.tabs} aria-label={copy.title}>
        {visibleTabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={tab.id === active ? styles.tabActive : styles.tab}
          >
            {copy.tabs[tab.id]}
          </Link>
        ))}
      </nav>
      {isLoading ? <p className={styles.muted}>{copy.loading}</p> : null}
      {!isLoading && !isAllowed ? <p className={styles.error}>{copy.noAccess}</p> : null}
      {!isLoading && isAllowed ? children({ lang, copy }) : null}
    </ExamShell>
  );
}
