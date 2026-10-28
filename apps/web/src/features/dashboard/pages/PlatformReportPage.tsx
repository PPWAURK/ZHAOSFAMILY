"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import { EmployeeUsageTable, NewsReadsTable, StoreUsageTable } from "@/features/dashboard/components/PlatformReportTables";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import {
  PLATFORM_REPORT_COPY,
  type ReportLanguage,
} from "@/features/dashboard/constants/platform-report-copy";
import {
  fetchPlatformMonthlyReport,
  type PlatformMonthlyReport,
} from "@/features/dashboard/services/platformReportApi";
import {
  buildNewsReadsCsv,
  buildStoreUsageCsv,
  downloadCsv,
} from "@/features/dashboard/utils/platformReportCsv";
import { formatReportRate } from "@/features/dashboard/utils/platformReportFormat";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import dashboardStyles from "@/features/dashboard/dashboard-page.module.css";
import styles from "@/features/dashboard/platform-report-page.module.css";

function getCurrentParisMonth(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function getMonthOptions(language: ReportLanguage): Array<{ value: string; label: string }> {
  const locale = language === "zh" ? "zh-CN" : language === "fr" ? "fr-FR" : "en-GB";
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1).padStart(2, "0");
    return { value, label: formatter.format(new Date(Date.UTC(2026, index, 15))) };
  });
}

function hasHeadquartersRole(jobRole: string | null | undefined): boolean {
  return `${jobRole || ""}`
    .split(",")
    .some((role) => role.trim().toLowerCase() === "holding");
}

const NEWS_PAGE_SIZE = 50;

export default function PlatformReportPage() {
  const { user } = useAuth();
  const [preferredLanguage, setLang] = usePreferredLanguage();
  const lang: ReportLanguage =
    preferredLanguage === "en" || preferredLanguage === "fr" ? preferredLanguage : "zh";
  const copy = PLATFORM_REPORT_COPY[lang];
  const [month, setMonth] = useState(getCurrentParisMonth);
  const currentYear = Number(getCurrentParisMonth().slice(0, 4));
  const selectedYear = month.slice(0, 4);
  const selectedMonth = month.slice(5, 7);
  const monthOptions = getMonthOptions(lang);
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const isAuthorized = hasHeadquartersRole(user?.jobRole);
  const [menuOpen, setMenuOpen] = useState(false);
  const [report, setReport] = useState<PlatformMonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [restaurantId, setRestaurantId] = useState("all");
  const [postId, setPostId] = useState("all");
  const [newsPage, setNewsPage] = useState(0);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const employeeDetailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthorized) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    setReport(null);
    setIsLoading(true);
    setHasError(false);
    void fetchPlatformMonthlyReport(month)
      .then((nextReport) => {
        if (active) setReport(nextReport);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthorized, month]);

  const visibleStores = useMemo(
    () => report?.stores.filter((store) => restaurantId === "all" || String(store.restaurantId) === restaurantId) ?? [],
    [report, restaurantId],
  );
  const visibleNews = useMemo(
    () => report?.newsByStore.filter((row) =>
      (restaurantId === "all" || String(row.restaurantId) === restaurantId) &&
      (postId === "all" || String(row.postId) === postId),
    ) ?? [],
    [report, restaurantId, postId],
  );
  const selectedStore = useMemo(
    () => report?.stores.find((store) => String(store.restaurantId) === restaurantId) ?? null,
    [report, restaurantId],
  );
  const newsOptions = useMemo(() => {
    const posts = new Map<number, string>();
    report?.newsByStore.forEach((row) => posts.set(row.postId, row.title));
    return [...posts.entries()];
  }, [report]);
  const newsPageCount = Math.max(1, Math.ceil(visibleNews.length / NEWS_PAGE_SIZE));
  const displayedNews = visibleNews.slice(
    newsPage * NEWS_PAGE_SIZE,
    (newsPage + 1) * NEWS_PAGE_SIZE,
  );

  function handleExportStores(): void {
    if (!report) return;
    downloadCsv(`platform-usage_${month}.csv`, buildStoreUsageCsv(month, visibleStores));
  }

  function handleExportNews(): void {
    if (!report) return;
    downloadCsv(`news-reads_${month}.csv`, buildNewsReadsCsv(month, visibleNews));
  }

  function handleMonthChange(nextMonth: string): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(nextMonth)) return;
    setMonth(nextMonth);
    setPostId("all");
    setNewsPage(0);
  }

  function handleSelectStore(storeId: number): void {
    setRestaurantId(String(storeId));
    setPostId("all");
    setNewsPage(0);
    window.requestAnimationFrame(() => {
      employeeDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main className={`${dashboardStyles.page} ${styles.page}`}>
      <header className={dashboardStyles.top}>
        <div className={dashboardStyles.topLeft}>
          <button
            type="button"
            className={`${dashboardStyles.menuToggle} ${menuOpen ? dashboardStyles.menuToggleOpen : ""}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={dashboardStyles.menuToggleIcon} aria-hidden="true">
              <span /><span /><span />
            </span>
            {menuOpen ? menuLabels.close : menuLabels.open}
          </button>
          <div className={dashboardStyles.topIndex}>
            <span><span className={dashboardStyles.topIndexBold}>ZHAO</span>&nbsp;/&nbsp;FAMILY</span>
            <span>REPORT</span>
          </div>
        </div>
        <div className={dashboardStyles.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={dashboardStyles.topLangSep}>/</span> : null}
              <button
                type="button"
                className={`${dashboardStyles.topLangBtn} ${lang === option.value ? dashboardStyles.topLangBtnActive : ""}`}
                onClick={() => {
                  if (typeof setLang === "function") setLang(option.value);
                }}
              >
                {option.label}
              </button>
            </Fragment>
          ))}
        </div>
      </header>

      <section className={styles.content}>
        <p className={styles.kicker}>ZHAO · PLATFORM REPORT</p>
        <h1>{copy.title}</h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>

        {!isAuthorized ? <p role="alert">{copy.denied}</p> : null}
        {isAuthorized ? (
          <div className={styles.filters}>
            <label className={styles.filter}>
              <span>{copy.year}</span>
              <select
                value={selectedYear}
                onChange={(event) => handleMonthChange(`${event.target.value}-${selectedMonth}`)}
              >
                {Array.from({ length: currentYear - 2010 }, (_, index) => currentYear - index).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <label className={styles.filter}>
              <span>{copy.month}</span>
              <select
                value={selectedMonth}
                onChange={(event) => handleMonthChange(`${selectedYear}-${event.target.value}`)}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {isAuthorized && isLoading ? <p role="status">{copy.loading}</p> : null}
        {isAuthorized && hasError ? <p role="alert">{copy.error}</p> : null}

        {isAuthorized && report && !isLoading ? (
          <>
            <div className={styles.metrics}>
              <div><span>{copy.currentStaff}</span><strong>{report.summary.approvedUsers}</strong></div>
              <div><span>{copy.activeUsers}</span><strong>{report.summary.activeUsers}</strong></div>
              <div><span>{copy.activityRate}</span><strong>{formatReportRate(report.summary.activityRate)}</strong></div>
              <div><span>{copy.moduleOpens}</span><strong>{report.summary.moduleOpens}</strong></div>
              <div><span>{copy.readRate}</span><strong>{formatReportRate(report.summary.readRate)}</strong></div>
            </div>

            <div className={styles.filters}>
              <label className={styles.filter}>
                <span>{copy.establishment}</span>
                <select value={restaurantId} onChange={(event) => {
                  setRestaurantId(event.target.value);
                  setNewsPage(0);
                }}>
                  <option value="all">{copy.allEstablishments}</option>
                  {report.stores.map((store) => (
                    <option key={store.restaurantId} value={store.restaurantId}>{store.restaurantName}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.sectionHeading}>
              <h2>{copy.overview}</h2>
              <button type="button" onClick={handleExportStores}>{copy.exportStores}</button>
            </div>
            <StoreUsageTable
              stores={visibleStores}
              lang={lang}
              copy={copy}
              onSelectStore={handleSelectStore}
            />

            <div className={styles.sectionHeading} ref={employeeDetailsRef}>
              <h2>{copy.employeeDetails}{selectedStore ? ` · ${selectedStore.restaurantName}` : ""}</h2>
            </div>
            {selectedStore ? (
              <EmployeeUsageTable employees={selectedStore.employeeUsage} lang={lang} copy={copy} />
            ) : <p>{copy.selectStoreForEmployees}</p>}

            <div className={styles.sectionHeading} ref={detailsRef}>
              <h2>{copy.details}</h2>
              <button type="button" disabled={visibleNews.length === 0} onClick={handleExportNews}>{copy.exportNews}</button>
            </div>
            <label className={styles.filter}>
              <span>{copy.news}</span>
              <select value={postId} onChange={(event) => {
                setPostId(event.target.value);
                setNewsPage(0);
              }}>
                <option value="all">{copy.allNews}</option>
                {newsOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
              </select>
            </label>
            {visibleNews.length === 0 ? <p>{copy.noNews}</p> : (
              <>
                <NewsReadsTable rows={displayedNews} lang={lang} copy={copy} />
                {newsPageCount > 1 ? (
                  <div className={styles.pagination}>
                    <button type="button" disabled={newsPage === 0} onClick={() => setNewsPage((page) => page - 1)}>{copy.previous}</button>
                    <span>{copy.page} {newsPage + 1} / {newsPageCount}</span>
                    <button type="button" disabled={newsPage + 1 >= newsPageCount} onClick={() => setNewsPage((page) => page + 1)}>{copy.next}</button>
                  </div>
                ) : null}
              </>
            )}
            <p className={styles.note}>{copy.note}</p>
          </>
        ) : null}
      </section>

      <footer className={styles.footer}>Since 2011 — ZHAO's Family Holding</footer>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
