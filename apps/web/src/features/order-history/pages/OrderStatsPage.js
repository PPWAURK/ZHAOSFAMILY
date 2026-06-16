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
    lede: "按供应商分组汇总本店的下单数量与采购金额，可按日期范围筛选。每个供应商单独成表，按采购金额从高到低排序。",
    from: "起始日期",
    to: "结束日期",
    store: "门店",
    storeAll: "全部门店",
    apply: "查询",
    clear: "清除",
    exportCsv: "导出 CSV",
    backToHistory: "← 返回订单历史",
    cardProducts: "商品种类",
    cardQuantity: "总下单数量",
    cardAmount: "总采购金额 (HT)",
    sortAmount: "按金额",
    sortQuantity: "按数量",
    supplierTotal: "供应商合计",
    tabAll: "全部供应商",
    colRank: "#",
    colProduct: "商品",
    colCategory: "类别",
    colQuantity: "数量",
    colLines: "下单次数",
    colAmount: "金额 (HT)",
    csvSupplier: "供应商",
    csvProductZh: "商品(中)",
    csvProductFr: "商品(法)",
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
    lede: "Quantities ordered and amount spent, grouped by supplier, for the selected store. Each supplier gets its own table, sorted by spend.",
    from: "From",
    to: "To",
    store: "Store",
    storeAll: "All stores",
    apply: "Apply",
    clear: "Clear",
    exportCsv: "Export CSV",
    backToHistory: "← Back to order history",
    cardProducts: "Products",
    cardQuantity: "Total quantity",
    cardAmount: "Total spend (excl. tax)",
    sortAmount: "By amount",
    sortQuantity: "By quantity",
    supplierTotal: "Supplier total",
    tabAll: "All suppliers",
    colRank: "#",
    colProduct: "Product",
    colCategory: "Category",
    colQuantity: "Qty",
    colLines: "Times ordered",
    colAmount: "Amount (excl. tax)",
    csvSupplier: "Supplier",
    csvProductZh: "Product (ZH)",
    csvProductFr: "Product (FR)",
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
    lede: "Quantités commandées et montant dépensé, groupés par fournisseur, pour la boutique sélectionnée. Chaque fournisseur a son tableau, trié par dépense.",
    from: "Du",
    to: "Au",
    store: "Boutique",
    storeAll: "Toutes les boutiques",
    apply: "Appliquer",
    clear: "Effacer",
    exportCsv: "Exporter CSV",
    backToHistory: "← Retour à l'historique",
    cardProducts: "Produits",
    cardQuantity: "Quantité totale",
    cardAmount: "Dépense totale (HT)",
    sortAmount: "Par montant",
    sortQuantity: "Par quantité",
    supplierTotal: "Total fournisseur",
    tabAll: "Tous fournisseurs",
    colRank: "#",
    colProduct: "Produit",
    colCategory: "Catégorie",
    colQuantity: "Qté",
    colLines: "Nb commandes",
    colAmount: "Montant (HT)",
    csvSupplier: "Fournisseur",
    csvProductZh: "Produit (ZH)",
    csvProductFr: "Produit (FR)",
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

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(suppliers, t) {
  const header = [
    t.csvSupplier,
    t.csvProductZh,
    t.csvProductFr,
    t.colCategory,
    "Unit",
    t.colQuantity,
    t.colLines,
    t.colAmount,
  ];
  const rows = [header.map(csvCell).join(",")];

  for (const supplier of suppliers) {
    for (const item of supplier.items) {
      rows.push(
        [
          supplier.supplierName,
          item.nameZh,
          item.nameFr || "",
          item.category,
          item.unit || "",
          item.totalQuantity,
          item.orderLineCount,
          item.totalAmount.toFixed(2),
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }

  return rows.join("\r\n");
}

export default function OrderStatsPage() {
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [storeId, setStoreId] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sortBy, setSortBy] = useState("amount");
  const [activeSupplier, setActiveSupplier] = useState("all");

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
          restaurantId: storeId ? Number(storeId) : undefined,
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
  }, [appliedRange, storeId, t.loadError]);

  const sortedSuppliers = useMemo(() => {
    const suppliers = stats?.suppliers ? [...stats.suppliers] : [];
    return suppliers.map((supplier) => ({
      ...supplier,
      items: [...supplier.items].sort((left, right) =>
        sortBy === "quantity"
          ? right.totalQuantity - left.totalQuantity
          : right.totalAmount - left.totalAmount,
      ),
    }));
  }, [stats, sortBy]);

  // If the selected supplier tab disappears after a refetch, fall back to All.
  const activeSupplierExists =
    activeSupplier === "all" ||
    sortedSuppliers.some(
      (supplier) => String(supplier.supplierId) === activeSupplier,
    );
  const effectiveSupplier = activeSupplierExists ? activeSupplier : "all";
  const visibleSuppliers =
    effectiveSupplier === "all"
      ? sortedSuppliers
      : sortedSuppliers.filter(
          (supplier) => String(supplier.supplierId) === effectiveSupplier,
        );

  function applyRange() {
    setAppliedRange({ from, to });
  }

  function clearRange() {
    setFrom("");
    setTo("");
    setAppliedRange({ from: "", to: "" });
  }

  function exportCsv() {
    if (visibleSuppliers.length === 0) return;
    const csv = buildCsv(visibleSuppliers, t);
    // Prepend a UTF-8 BOM so Excel opens Chinese/French text correctly.
    const bom = String.fromCharCode(0xfeff);
    const blob = new Blob([bom, csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const range = [stats?.from, stats?.to].filter(Boolean).join("_") || "all";
    const scope =
      effectiveSupplier === "all"
        ? "all-suppliers"
        : (visibleSuppliers[0]?.supplierName || "supplier").replace(
            /[^\p{L}\p{N}_-]+/gu,
            "-",
          );
    link.href = url;
    link.download = `order-stats_${scope}_${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasData = sortedSuppliers.length > 0;

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

        <div className={styles.filters} aria-label={t.store}>
          {stats?.canViewAllStores ? (
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>{t.store}</span>
              <select
                className={styles.filterControl}
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
              >
                <option value="">{t.storeAll}</option>
                {stats.stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className={styles.filterField}>
            <span className={styles.filterLabel}>{t.from}</span>
            <input
              type="date"
              className={styles.filterControl}
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <span className={styles.filterLabel}>{t.to}</span>
            <input
              type="date"
              className={styles.filterControl}
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${shell.btn} ${shell.btnPrimary}`}
              onClick={applyRange}
            >
              {t.apply}
            </button>
            {appliedRange.from || appliedRange.to ? (
              <button
                type="button"
                className={`${shell.btn} ${shell.btnGhost}`}
                onClick={clearRange}
              >
                {t.clear}
              </button>
            ) : null}
            <button
              type="button"
              className={`${shell.btn} ${shell.btnGhost}`}
              onClick={exportCsv}
              disabled={!hasData}
            >
              {t.exportCsv}
            </button>
          </div>
        </div>

        {loadError ? <p className={styles.error}>{loadError}</p> : null}

        <div className={styles.metrics}>
          <div className={styles.metric}>
            <p className={styles.metricValue}>
              {formatNumber(stats?.totalProducts)}
            </p>
            <p className={styles.metricLabel}>{t.cardProducts}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricValue}>
              {formatNumber(stats?.totalQuantity)}
            </p>
            <p className={styles.metricLabel}>{t.cardQuantity}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricValue}>
              {formatAmount(stats?.totalAmount)}
            </p>
            <p className={styles.metricLabel}>{t.cardAmount}</p>
          </div>
        </div>

        {hasData ? (
          <div className={styles.tabsRow}>
            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={effectiveSupplier === "all"}
                className={`${styles.tab} ${effectiveSupplier === "all" ? styles.tabActive : ""}`}
                onClick={() => setActiveSupplier("all")}
              >
                {t.tabAll}
              </button>
              {sortedSuppliers.map((supplier) => {
                const key = String(supplier.supplierId);
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={effectiveSupplier === key}
                    className={`${styles.tab} ${effectiveSupplier === key ? styles.tabActive : ""}`}
                    onClick={() => setActiveSupplier(key)}
                  >
                    {supplier.supplierName}
                    <span className={styles.tabAmount}>
                      {formatAmount(supplier.totalAmount)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={styles.sort} role="group">
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
          </div>
        ) : null}

        {isLoading ? (
          <p className={styles.muted}>{t.loading}</p>
        ) : !hasData ? (
          <p className={styles.muted}>{t.empty}</p>
        ) : (
          visibleSuppliers.map((supplier) => (
            <section key={supplier.supplierId}>
              <p className={styles.supplierHeading}>
                <span>{supplier.supplierName}</span>
                <span className={styles.supplierTotal}>
                  {formatNumber(supplier.totalQuantity)} ·{" "}
                  <strong>{formatAmount(supplier.totalAmount)}</strong>
                </span>
              </p>

              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <span>{t.colRank}</span>
                  <span>{t.colProduct}</span>
                  <span>{t.colCategory}</span>
                  <span className={styles.num}>{t.colQuantity}</span>
                  <span className={styles.num}>{t.colLines}</span>
                  <span className={styles.num}>{t.colAmount}</span>
                </div>
                {supplier.items.map((item, index) => (
                  <div key={item.productId} className={styles.row}>
                    <span className={styles.rank}>{index + 1}</span>
                    <span className={styles.product}>
                      <strong>
                        {item.nameZh || item.nameFr || item.productId}
                      </strong>
                      {item.nameFr && item.nameFr !== item.nameZh ? (
                        <small>{item.nameFr}</small>
                      ) : null}
                    </span>
                    <span>
                      {item.category ? (
                        <em className={styles.chip}>{item.category}</em>
                      ) : (
                        "-"
                      )}
                    </span>
                    <span className={styles.num}>
                      {formatNumber(item.totalQuantity)}
                      {item.unit ? (
                        <em className={styles.unit}> {item.unit}</em>
                      ) : null}
                    </span>
                    <span className={styles.num}>
                      {formatNumber(item.orderLineCount)}
                    </span>
                    <span className={styles.amount}>
                      {formatAmount(item.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </motion.section>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
