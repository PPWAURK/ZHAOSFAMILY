"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import { SCREEN_SECURITY_COPY } from "@/features/screen-security/constants/screen-security-copy";
import {
  deleteScreenSecurityEvents,
  fetchScreenSecurityEvents,
} from "@/features/screen-security/services/screenSecurityApi";
import styles from "@/features/screen-security/screen-security-page.module.css";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";

function getLocale(lang) {
  if (lang === "zh") return "zh-CN";
  if (lang === "fr") return "fr-FR";
  return "en-GB";
}

function formatDateLabel(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(getLocale(lang), {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatTimeLabel(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString(getLocale(lang), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeviceInfoPreview(value, fallback) {
  const normalizedValue = `${value || ""}`.trim();
  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue.length > 120
    ? `${normalizedValue.slice(0, 117)}...`
    : normalizedValue;
}

function replaceTokens(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

export default function ScreenSecurityPage() {
  const [lang, setLang] = usePreferredLanguage();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const t = SCREEN_SECURITY_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize) || 1),
    [pageSize, total],
  );

  const currentPageIds = useMemo(() => events.map((event) => event.id), [events]);
  const isAllCurrentPageSelected = useMemo(
    () => currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id)),
    [currentPageIds, selectedIds],
  );
  const isSomeCurrentPageSelected = useMemo(
    () => currentPageIds.some((id) => selectedIds.includes(id)) && !isAllCurrentPageSelected,
    [currentPageIds, isAllCurrentPageSelected, selectedIds],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetchScreenSecurityEvents({
        page,
        pageSize,
        eventType: eventTypeFilter === "all" ? undefined : eventTypeFilter,
        userId: userIdFilter.trim() || undefined,
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
      });

      setEvents(response.items);
      setTotal(response.total);
    } catch (error) {
      setEvents([]);
      setTotal(0);
      setLoadError(error?.message || t.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [dateFromFilter, dateToFilter, eventTypeFilter, page, pageSize, t.loadError, userIdFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleEventTypeChange = useCallback((event) => {
    setEventTypeFilter(event.target.value);
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handleUserIdChange = useCallback((event) => {
    setUserIdFilter(event.target.value);
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handleDateFromChange = useCallback((event) => {
    setDateFromFilter(event.target.value);
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handleDateToChange = useCallback((event) => {
    setDateToFilter(event.target.value);
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  }, [totalPages]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const currentPageIds = events.map((event) => event.id);
      const allSelected = currentPageIds.every((id) => prev.includes(id));

      if (allSelected) {
        return prev.filter((id) => !currentPageIds.includes(id));
      }

      const merged = new Set([...prev, ...currentPageIds]);
      return Array.from(merged);
    });
  }, [events]);

  const handleToggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
    );
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      return;
    }

    const confirmMessage = replaceTokens(t.selection.deleteConfirm, {
      count: selectedIds.length,
    });

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);

    try {
      const deletedCount = await deleteScreenSecurityEvents(selectedIds);

      const successMessage = replaceTokens(t.selection.deleteSuccess, {
        count: deletedCount,
      });

      window.alert(successMessage);
      setSelectedIds([]);
      await refresh();
    } catch (error) {
      window.alert(error?.message || t.selection.deleteError);
    } finally {
      setIsDeleting(false);
    }
  }, [refresh, selectedIds, t.selection.deleteConfirm, t.selection.deleteError, t.selection.deleteSuccess]);

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <button
            type="button"
            className={`${styles.menuToggle} ${menuOpen ? styles.menuToggleOpen : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={styles.menuToggleIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {menuOpen ? menuLabels.close : menuLabels.open}
          </button>

          <div className={styles.topIndex}>
            <span>
              <span className={styles.topIndexBold}>ZHAO</span>
              &nbsp;/&nbsp;{t.topFamily}
            </span>
            <span>{t.topStage}</span>
            <span>{t.topCycle}</span>
          </div>
        </div>

        <div className={styles.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={styles.topLangSep}>/</span> : null}
              <button
                type="button"
                className={`${styles.topLangBtn} ${
                  lang === option.value ? styles.topLangBtnActive : ""
                }`}
                onClick={() => setLang(option.value)}
              >
                {option.label}
              </button>
            </Fragment>
          ))}
        </div>
      </header>

      <motion.section
        className={styles.main}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.kicker}>
          <span className={styles.kickerDot} />
          {t.kicker}
        </p>

        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lede}>{t.lede}</p>

        <section className={styles.filters} aria-label={t.filters.heading}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="screen-security-event-type">
              {t.filters.eventType}
            </label>
            <select
              id="screen-security-event-type"
              className={styles.filterSelect}
              value={eventTypeFilter}
              onChange={handleEventTypeChange}
            >
              <option value="all">{t.eventTypes.all}</option>
              <option value="screenshot">{t.eventTypes.screenshot}</option>
              <option value="recording">{t.eventTypes.recording}</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="screen-security-user-id">
              {t.filters.userId}
            </label>
            <input
              id="screen-security-user-id"
              className={styles.filterInput}
              value={userIdFilter}
              onChange={handleUserIdChange}
              placeholder={t.filters.userIdPlaceholder}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="screen-security-date-from">
              {t.filters.dateFrom}
            </label>
            <input
              id="screen-security-date-from"
              type="date"
              className={styles.filterInput}
              value={dateFromFilter}
              onChange={handleDateFromChange}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="screen-security-date-to">
              {t.filters.dateTo}
            </label>
            <input
              id="screen-security-date-to"
              type="date"
              className={styles.filterInput}
              value={dateToFilter}
              onChange={handleDateToChange}
            />
          </div>
        </section>

        {isLoading ? (
          <div className={styles.empty}>{t.loading}</div>
        ) : loadError ? (
          <div className={styles.empty}>{loadError}</div>
        ) : events.length === 0 ? (
          <div className={styles.empty}>{t.empty}</div>
        ) : (
          <>
            {selectedIds.length > 0 ? (
              <div className={styles.selectionBar}>
                <div className={styles.selectionBarInfo}>
                  <span>
                    {replaceTokens(t.selection.selectedCount, { count: selectedIds.length })}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                >
                  {isDeleting ? t.selection.deleting : t.selection.deleteSelected}
                </button>
              </div>
            ) : null}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isAllCurrentPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeCurrentPageSelected;
                        }}
                        onChange={handleToggleSelectAll}
                        aria-label={t.selection.selectAll}
                      />
                    </th>
                    <th>{t.table.date}</th>
                    <th>{t.table.user}</th>
                    <th>{t.table.eventType}</th>
                    <th>{t.table.screen}</th>
                    <th>{t.table.device}</th>
                    <th>{t.table.time}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedIds.includes(event.id)}
                          onChange={() => handleToggleSelectOne(event.id)}
                          aria-label={t.selection.selectAll}
                        />
                      </td>
                      <td>{formatDateLabel(event.createdAt, lang)}</td>
                      <td>
                        <div className={styles.cellStack}>
                          <strong>{event.userName || t.unknownUser}</strong>
                          <span className={styles.cellMuted}>{event.userId || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.eventBadge} ${
                            event.eventType === "recording"
                              ? styles.eventBadgeRecording
                              : styles.eventBadgeScreenshot
                          }`}
                        >
                          {t.eventTypes[event.eventType]}
                        </span>
                      </td>
                      <td>{event.screenName || t.unknownScreen}</td>
                      <td>
                        <span className={styles.devicePreview}>
                          {formatDeviceInfoPreview(event.deviceInfo, t.unknownDevice)}
                        </span>
                      </td>
                      <td>{formatTimeLabel(event.createdAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.paginationBtn}
                onClick={handlePreviousPage}
                disabled={page <= 1 || isLoading}
              >
                {t.pagination.prev}
              </button>

              <p className={styles.paginationInfo}>
                {replaceTokens(t.pagination.pageInfo, {
                  page,
                  pages: totalPages,
                  total,
                })}
              </p>

              <button
                type="button"
                className={styles.paginationBtn}
                onClick={handleNextPage}
                disabled={page >= totalPages || isLoading}
              >
                {t.pagination.next}
              </button>
            </div>
          </>
        )}

        <div className={styles.backRow}>
          <a href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </a>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
