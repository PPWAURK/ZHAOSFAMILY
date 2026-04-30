"use client";

import { Fragment, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_COPY,
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
  DASHBOARD_NEWS_ITEMS,
  DASHBOARD_SHORTCUT_HREFS,
} from "@/features/dashboard/constants/dashboard-copy";
import styles from "@/features/dashboard/dashboard-page.module.css";

function resolveDisplayName(user, fallback) {
  return (
    user?.name?.trim() ||
    [user?.familyName, user?.givenName].filter(Boolean).join(" ").trim() ||
    fallback
  );
}

function sortNewsItems(items, lang, sortKey) {
  const sortedItems = [...items];

  sortedItems.sort((left, right) => {
    if (sortKey === "oldest") {
      return left.date.localeCompare(right.date);
    }

    if (sortKey === "title") {
      return left.title[lang].localeCompare(right.title[lang], lang);
    }

    return right.date.localeCompare(left.date);
  });

  return sortedItems;
}

function groupItemsByColumn(items) {
  return items.reduce(
    (groups, item) => {
      groups[item.column].push(item);
      return groups;
    },
    {
      news: [],
      congrats: [],
      issues: [],
    },
  );
}

export default function DashboardPage() {
  const [lang, setLang] = useState("zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVisibility, setSelectedVisibility] = useState("all");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedTag, setSelectedTag] = useState("all");
  const { user } = useAuth();
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const t = DASHBOARD_COPY[lang];
  const newsCopy = t.newsModule;
  const displayName = resolveDisplayName(user, t.greetingFallback);

  const availableTags = [
    "all",
    ...new Set(
      DASHBOARD_NEWS_ITEMS.flatMap((item) => item.tags).sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    ),
  ];

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredNews = sortNewsItems(
    DASHBOARD_NEWS_ITEMS.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      if (selectedVisibility !== "all" && item.visibility !== selectedVisibility) {
        return false;
      }

      if (selectedTag !== "all" && !item.tags.includes(selectedTag)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const itemSearchText = [
        item.title[lang],
        item.summary[lang],
        item.author,
        item.dateLabel,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase();

      return itemSearchText.includes(normalizedQuery);
    }),
    lang,
    selectedSort,
  );

  const newsByColumn = groupItemsByColumn(filteredNews);

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

        <h1 className={styles.title}>
          {t.greetingPrefix}
          <span className={styles.titleEm}>{displayName}</span>
          {t.greetingSuffix}
        </h1>

        <p className={styles.lede}>{t.lede}</p>

        <p className={styles.shortcutsHeading}>{t.shortcutsHeading}</p>

        <div className={styles.shortcutGrid}>
          {t.shortcuts.map((shortcut, index) => (
            <Link
              key={shortcut.id}
              href={DASHBOARD_SHORTCUT_HREFS[shortcut.id] || "#"}
              className={styles.shortcutCard}
            >
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className={styles.shortcutIndex}>
                  <span className={styles.shortcutIndexNum}>{shortcut.index}</span>
                  <span>— {shortcut.label}</span>
                </span>

                <div className={styles.shortcutBody}>
                  <h2 className={styles.shortcutTitle}>{shortcut.title}</h2>
                  <p className={styles.shortcutDetail}>{shortcut.detail}</p>
                </div>

                <span className={styles.shortcutArrow} aria-hidden="true">
                  →
                </span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      <motion.section
        className={styles.newsModule}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.newsHero}>
          <p className={styles.newsEyebrow}>{newsCopy.kicker}</p>
          <h2 className={styles.newsTitle}>
            {newsCopy.title}
            <span className={styles.newsTitleAccent}>{newsCopy.titleAccent}</span>
          </h2>
          <p className={styles.newsSubtitle}>{newsCopy.subtitle}</p>
        </div>

        <div className={styles.newsSectionLine}>{newsCopy.overviewLabel}</div>

        <section className={styles.newsStats} aria-label={newsCopy.overviewLabel}>
          <article className={styles.newsStat}>
            <p className={styles.newsStatLabel}>{newsCopy.stats.total}</p>
            <p className={styles.newsStatValue}>{filteredNews.length}</p>
          </article>
          <article className={styles.newsStat}>
            <p className={styles.newsStatLabel}>{newsCopy.stats.news}</p>
            <p className={styles.newsStatValue}>{newsByColumn.news.length}</p>
          </article>
          <article className={styles.newsStat}>
            <p className={styles.newsStatLabel}>{newsCopy.stats.congrats}</p>
            <p className={styles.newsStatValue}>{newsByColumn.congrats.length}</p>
          </article>
          <article className={styles.newsStat}>
            <p className={styles.newsStatLabel}>{newsCopy.stats.issues}</p>
            <p className={styles.newsStatValue}>{newsByColumn.issues.length}</p>
          </article>
        </section>

        <section className={styles.newsFilters} aria-label={newsCopy.filters.reset}>
          <label className={styles.newsField}>
            <span className={styles.newsFieldLabel}>{newsCopy.filters.search}</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={newsCopy.filters.searchPlaceholder}
            />
          </label>

          <label className={styles.newsField}>
            <span className={styles.newsFieldLabel}>{newsCopy.filters.category}</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {Object.entries(newsCopy.categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.newsField}>
            <span className={styles.newsFieldLabel}>{newsCopy.filters.visibility}</span>
            <select
              value={selectedVisibility}
              onChange={(event) => setSelectedVisibility(event.target.value)}
            >
              {Object.entries(newsCopy.visibility).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.newsField}>
            <span className={styles.newsFieldLabel}>{newsCopy.filters.sort}</span>
            <select
              value={selectedSort}
              onChange={(event) => setSelectedSort(event.target.value)}
            >
              {Object.entries(newsCopy.sort).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={styles.resetFilters}
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setSelectedVisibility("all");
              setSelectedSort("newest");
              setSelectedTag("all");
            }}
          >
            {newsCopy.filters.reset}
          </button>
        </section>

        <div className={styles.tagRow}>
          {availableTags.map((tag) => {
            const label = tag === "all" ? newsCopy.categories.all : `#${tag}`;
            const isActive = selectedTag === tag;

            return (
              <button
                key={tag}
                type="button"
                className={`${styles.tagChip} ${isActive ? styles.tagChipActive : ""}`}
                onClick={() => setSelectedTag(tag)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className={styles.newsBoard}>
          {Object.entries(newsCopy.columns).map(([columnKey, columnMeta], columnIndex) => {
            const columnItems = newsByColumn[columnKey];

            return (
              <section key={columnKey} className={styles.newsColumn}>
                <div className={styles.newsColumnHead}>
                  <div>
                    <p className={styles.newsColumnIndex}>
                      {columnMeta.index} · {columnMeta.title}
                    </p>
                    <h3 className={styles.newsColumnTitle}>{columnMeta.title}</h3>
                    <p className={styles.newsColumnSubtitle}>{columnMeta.subtitle}</p>
                  </div>
                  <p className={styles.newsColumnCount}>
                    {columnItems.length} {newsCopy.cardsLabel}
                  </p>
                </div>

                <div className={styles.newsCardList}>
                  {columnItems.length ? (
                    columnItems.map((item, itemIndex) => (
                      <motion.article
                        key={item.id}
                        className={styles.newsCard}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.05 * (columnIndex + itemIndex),
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <div className={styles.newsCardMetaTop}>
                          <div className={styles.newsCardMetaBlock}>
                            <p className={styles.newsMiniMeta}>
                              {newsCopy.dateLabel} · {item.dateLabel}
                            </p>
                            <h4 className={styles.newsCardTitle}>{item.title[lang]}</h4>
                            <p className={styles.newsAuthorLine}>
                              {newsCopy.byLabel} · {item.author}
                            </p>
                          </div>

                          <span
                            className={`${styles.visibilityBadge} ${
                              styles[`visibility${item.visibility}`]
                            }`}
                          >
                            {newsCopy.visibility[item.visibility]}
                          </span>
                        </div>

                        <p className={styles.newsCardContent}>{item.summary[lang]}</p>

                        <div className={styles.newsMetaGrid}>
                          <span>
                            {newsCopy.filters.category} · {newsCopy.categories[item.category]}
                          </span>
                          <span>
                            {newsCopy.attachmentLabel} ·{" "}
                            {item.attachment ? item.attachment.name : "—"}
                          </span>
                        </div>

                        <div className={styles.newsTags}>
                          {item.tags.map((tag) => (
                            <span key={tag} className={styles.newsTag}>
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {item.attachment ? (
                          <a
                            href={item.attachment.href}
                            className={styles.attachmentCard}
                            onClick={(event) => event.preventDefault()}
                          >
                            <div>
                              <strong>{item.attachment.name}</strong>
                              <small>{item.attachment.size}</small>
                            </div>
                            <span aria-hidden="true">→</span>
                          </a>
                        ) : null}
                      </motion.article>
                    ))
                  ) : (
                    <div className={styles.newsEmpty}>{newsCopy.empty}</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
