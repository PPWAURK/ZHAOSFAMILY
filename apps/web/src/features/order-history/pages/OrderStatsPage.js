"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import { fetchProductOrderStats } from "@/features/orders/services/ordersApi";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import shell from "@/features/order-history/order-history-page.module.css";
import styles from "@/features/order-history/order-stats-page.module.css";

const COPY = {
  zh: {
    topFamily: "采购统计",
    topStage: "ORDER ANALYTICS",
    topCycle: "Since 2011",
    kicker: "ZHAO's · 订单 · 商品统计",
    title: "商品下单",
    titleEm: "统计",
    titleSuffix: "。",
    lede: "按商品汇总本店的下单数量与采购金额，可按日期范围筛选。默认按采购金额从高到低排序。",
    from: "起始日期",
    to: "结束日期",
    apply: "查询",
    clear: "清除",
    backToHistory: "← 返回订单历史",
    cardProducts: "商品种类",
    cardQuantity: "总下单数量",
    cardAmount: "总采购金额 (HT)",
    sortAmount: "按金额",
    sortQuantity: "按数量",
    colRank: "#",
    colProduct: "商品",
    colCategory: "类别",
    colQuantity: "数量",
    colLines: "下单次数",
    colAmount: "金额 (HT)",
    empty: "该时间范围内暂无下单记录。",
    loadError: "统计加载失败，请稍后重试。",
    loading: "正在统计…",
  },
  en: {
    topFamily: "Purchase analytics",
    topStage: "ORDER ANALYTICS",
    topCycle: "Since 2011",
    kicker: "ZHAO's · Orders · Product stats",
    title: "Product order",
    titleEm: "stats",
    titleSuffix: ".",
    lede: "Quantities ordered and amount spent per product for your store, filterable by date range. Sorted by spend (high to low) by default.",
    from: "From",
    to: "To",
    apply: "Apply",
    clear: "Clear",
    backToHistory: "← Back to order history",
    cardProducts: "Products",
    cardQuantity: "Total quantity",
    cardAmount: "Total spend (excl. tax)",
    sortAmount: "By amount",
    sortQuantity: "By quantity",
    colRank: "#",
    colProduct: "Product",
    colCategory: "Category",
    colQuantity: "Qty",
    colLines: "Times ordered",
    colAmount: "Amount (excl. tax)",
    empty: "No orders in this date range.",
    loadError: "Failed to load stats. Please try again.",
    loading: "Crunching numbers…",
  },
  fr: {
    topFamily: "Statistiques achats",
    topStage: "ORDER ANALYTICS",
    topCycle: "Since 2011",
    kicker: "ZHAO's · Commandes · Stats produits",
    title: "Statistiques",
    titleEm: "produits",
    titleSuffix: ".",
    lede: "Quantités commandées et montant dépensé par produit pour votre boutique, filtrables par période. Triées par dépense (décroissant) par défaut.",
    from: "Du",
    to: "Au",
    apply: "Appliquer",
    clear: "Effacer",
    backToHistory: "← Retour à l'historique",
    cardProducts: "Produits",
    cardQuantity: "Quantité totale",
    cardAmount: "Dépense totale (HT)",
    sortAmount: "Par montant",
    sortQuantity: "Par quantité",
    colRank: "#",
    colProduct: "Produit",
    colCategory: "Catégorie",
    colQuantity: "Qté",
    colLines: "Nb commandes",
    colAmount: "Montant (HT)",
    empty: "Aucune commande sur cette période.",
    loadError: "Échec du chargement. Veuillez réessayer.",
    loading: "Calcul en cours…",
  },
};

function formatAmount(value) {
  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export default function OrderStatsPage() {
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sortBy, setSortBy] = useState("amount");

  const t = COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError("");
        const result = await fetchProductOrderStats({
          from: appliedRange.from || undefined,
          to: appliedRange.to || undefined,
        });
        if (!isCancelled) {
          setStats(result);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error?.message || t.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [appliedRange, t.loadError]);

  const sortedItems = useMemo(() => {
    const items = stats?.items ? [...stats.items] : [];
    return items.sort((left, right) =>
      sortBy === "quantity"
        ? right.totalQuantity - left.totalQuantity
        : right.totalAmount - left.totalAmount,
    );
  }, [stats, sortBy]);

  function applyRange() {
    setAppliedRange({ from, to });
  }

  function clearRange() {
    setFrom("");
    setTo("");
    setAppliedRange({ from: "", to: "" });
  }

  return (
    <main className={shell.page}>
      <header className={shell.top}>
        <div className={shell.topLeft}>
          <button
            type="button"
            className={`${shell.menuToggle} ${menuOpen ? shell.menuToggleOpen : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={shell.menuToggleIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {menuOpen ? menuLabels.close : menuLabels.open}
          </button>

          <div className={shell.topIndex}>
            <span>
              <span className={shell.topIndexBold}>ZHAO</span>
              &nbsp;/&nbsp;{t.topFamily}
            </span>
            <span>{t.topStage}</span>
            <span>{t.topCycle}</span>
          </div>
        </div>

        <div className={shell.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={shell.topLangSep}>/</span> : null}
              <button
                type="button"
                className={`${shell.topLangBtn} ${
                  lang === option.value ? shell.topLangBtnActive : ""
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
        className={shell.main}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={shell.kicker}>
          <span className={shell.kickerDot} />
          {t.kicker}
        </p>

        <h1 className={shell.title}>
          {t.title}
          <span className={shell.titleEm}>{t.titleEm}</span>
          {t.titleSuffix}
        </h1>

        <p className={styles.lede}>{t.lede}</p>

        <Link href="/dashboard/orders" className={styles.backLink}>
          {t.backToHistory}
        </Link>

        <div className={styles.controls}>
          <label className={styles.field}>
            <span>{t.from}</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t.to}</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button type="button" className={styles.btn} onClick={applyRange}>
            {t.apply}
          </button>
          {appliedRange.from || appliedRange.to ? (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={clearRange}
            >
              {t.clear}
            </button>
          ) : null}
        </div>

        {loadError ? <p className={styles.error}>{loadError}</p> : null}

        <div className={styles.cards}>
          <article className={styles.card}>
            <p className={styles.cardValue}>
              {formatNumber(stats?.totalProducts)}
            </p>
            <p className={styles.cardLabel}>{t.cardProducts}</p>
          </article>
          <article className={styles.card}>
            <p className={styles.cardValue}>
              {formatNumber(stats?.totalQuantity)}
            </p>
            <p className={styles.cardLabel}>{t.cardQuantity}</p>
          </article>
          <article className={styles.card}>
            <p className={styles.cardValue}>{formatAmount(stats?.totalAmount)}</p>
            <p className={styles.cardLabel}>{t.cardAmount}</p>
          </article>
        </div>

        <div className={styles.sortRow}>
          <button
            type="button"
            className={`${styles.sortBtn} ${sortBy === "amount" ? styles.sortBtnActive : ""}`}
            onClick={() => setSortBy("amount")}
          >
            {t.sortAmount}
          </button>
          <button
            type="button"
            className={`${styles.sortBtn} ${sortBy === "quantity" ? styles.sortBtnActive : ""}`}
            onClick={() => setSortBy("quantity")}
          >
            {t.sortQuantity}
          </button>
        </div>

        {isLoading ? (
          <p className={styles.muted}>{t.loading}</p>
        ) : sortedItems.length === 0 ? (
          <p className={styles.muted}>{t.empty}</p>
        ) : (
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.headRow}`}>
              <span>{t.colRank}</span>
              <span>{t.colProduct}</span>
              <span>{t.colCategory}</span>
              <span className={styles.numCol}>{t.colQuantity}</span>
              <span className={styles.numCol}>{t.colLines}</span>
              <span className={styles.numCol}>{t.colAmount}</span>
            </div>
            {sortedItems.map((item, index) => (
              <div key={item.productId} className={styles.row}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.product}>
                  <strong>{item.nameZh || item.nameFr || item.productId}</strong>
                  {item.nameFr && item.nameFr !== item.nameZh ? (
                    <small>{item.nameFr}</small>
                  ) : null}
                </span>
                <span className={styles.category}>{item.category || "-"}</span>
                <span className={styles.numCol}>
                  {formatNumber(item.totalQuantity)}
                  {item.unit ? ` ${item.unit}` : ""}
                </span>
                <span className={styles.numCol}>
                  {formatNumber(item.orderLineCount)}
                </span>
                <span className={`${styles.numCol} ${styles.amount}`}>
                  {formatAmount(item.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
