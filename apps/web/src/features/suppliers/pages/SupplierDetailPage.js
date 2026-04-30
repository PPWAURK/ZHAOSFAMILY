"use client";

import { Fragment, useState } from "react";
import { motion } from "motion/react";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import ConfirmDialog from "@/features/suppliers/components/ConfirmDialog";
import ProductEditRow from "@/features/suppliers/components/ProductEditRow";
import SupplierForm from "@/features/suppliers/components/SupplierForm";
import { SUPPLIERS_COPY } from "@/features/suppliers/constants/suppliers-copy";
import { useSupplierDetail } from "@/features/suppliers/store/suppliersStore";
import styles from "@/features/suppliers/suppliers-page.module.css";

const NEW_PRODUCT_ID = "__new__";

function emptyProduct(supplierId) {
  return {
    id: NEW_PRODUCT_ID,
    supplierId,
    reference: "",
    category: "",
    nameCn: "",
    designationFr: "",
    unit: "",
    price: 0,
    specification: "",
    image: "",
  };
}

export default function SupplierDetailPage({ supplierId }) {
  const [lang, setLang] = useState("zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newDraft, setNewDraft] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState("");

  const {
    supplier,
    products,
    isLoading,
    error,
    saveInfo,
    addProduct,
    updateProduct,
    removeProduct,
  } = useSupplierDetail(supplierId);

  const t = SUPPLIERS_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  async function handleSaveInfo(data) {
    setSavingInfo(true);
    setPageError("");
    try {
      await saveInfo(data);
      setEditingInfo(false);
    } catch (err) {
      setPageError(err?.message || t.saveError);
      throw err;
    } finally {
      setSavingInfo(false);
    }
  }

  function startAddProduct() {
    setEditingProductId(NEW_PRODUCT_ID);
    setNewDraft(emptyProduct(supplierId));
  }

  function cancelEdit() {
    setEditingProductId(null);
    setNewDraft(null);
  }

  async function saveProduct(draft) {
    setSavingProduct(true);
    setPageError("");
    try {
      if (editingProductId === NEW_PRODUCT_ID) {
        await addProduct(draft);
      } else if (editingProductId) {
        await updateProduct(editingProductId, draft);
      }
      cancelEdit();
    } catch (err) {
      setPageError(err?.message || t.saveError);
    } finally {
      setSavingProduct(false);
    }
  }

  async function confirmDeleteProduct() {
    if (!pendingDelete) return;
    setDeleting(true);
    setPageError("");
    try {
      await removeProduct(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setPageError(err?.message || t.deleteError);
    } finally {
      setDeleting(false);
    }
  }

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

        {isLoading ? (
          <>
            <h1 className={styles.title}>{t.loading}</h1>
            <div className={styles.notFound}>…</div>
          </>
        ) : error ? (
          <>
            <h1 className={styles.title}>{t.loadError}</h1>
            <div className={styles.backRow}>
              <a href="/dashboard/suppliers" className={styles.backLink}>
                {t.backToList}
              </a>
            </div>
          </>
        ) : !supplier ? (
          <>
            <h1 className={styles.title}>{t.notFound}</h1>
            <div className={styles.notFound}>{supplierId}</div>
            <div className={styles.backRow}>
              <a href="/dashboard/suppliers" className={styles.backLink}>
                {t.backToList}
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>{supplier.name}</h1>

            {pageError ? (
              <div className={styles.notFound} style={{ marginBottom: 16 }}>
                {pageError}
              </div>
            ) : null}

            {/* Infos */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeadingBlock}>
                  <h2 className={styles.sectionHeading}>
                    {t.detailInfoHeading}
                  </h2>
                  <p className={styles.sectionHint}>{t.detailInfoHint}</p>
                </div>
                {!editingInfo ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => setEditingInfo(true)}
                  >
                    {t.editInfo}
                  </button>
                ) : null}
              </div>

              {editingInfo ? (
                <SupplierForm
                  copy={t}
                  initial={supplier}
                  submitting={savingInfo}
                  onCancel={() => setEditingInfo(false)}
                  onSubmit={handleSaveInfo}
                />
              ) : (
                <dl className={styles.cardMeta} style={{ borderTop: "none" }}>
                  <div className={styles.cardMetaRow}>
                    <dt>{t.fieldName}</dt>
                    <dd>{supplier.name}</dd>
                  </div>
                  <div className={styles.cardMetaRow}>
                    <dt>{t.fieldSortOrder}</dt>
                    <dd>{supplier.sortOrder ?? "—"}</dd>
                  </div>
                  <div className={styles.cardMetaRow}>
                    <dt>{t.fieldIncludeAll}</dt>
                    <dd>
                      {supplier.includeAllProductsInOrder
                        ? t.truePill
                        : t.falsePill}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {/* Produits */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeadingBlock}>
                  <h2 className={styles.sectionHeading}>
                    {t.productsHeading}{" "}
                    <span style={{ color: "var(--ink-40)", fontSize: 14 }}>
                      · {products.length} {t.productsCount}
                    </span>
                  </h2>
                  <p className={styles.sectionHint}>{t.productsHint}</p>
                </div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={startAddProduct}
                  disabled={editingProductId !== null}
                >
                  {t.addProduct}
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t.colReference}</th>
                      <th>{t.colCategory}</th>
                      <th>{t.colNameCn}</th>
                      <th>{t.colDesignationFr}</th>
                      <th>{t.colUnit}</th>
                      <th style={{ textAlign: "right" }}>{t.colPrice}</th>
                      <th>{t.colSpecification}</th>
                      <th>{t.colImage}</th>
                      <th style={{ textAlign: "right" }}>{t.colActions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingProductId === NEW_PRODUCT_ID && newDraft ? (
                      <ProductEditRow
                        product={newDraft}
                        editing
                        submitting={savingProduct}
                        copy={t}
                        onCancelEdit={cancelEdit}
                        onSave={saveProduct}
                      />
                    ) : null}

                    {products.length === 0 &&
                    editingProductId !== NEW_PRODUCT_ID ? (
                      <tr>
                        <td colSpan={9} className={styles.rowEmpty}>
                          {t.noProducts}
                        </td>
                      </tr>
                    ) : null}

                    {products.map((product) => (
                      <ProductEditRow
                        key={product.id}
                        product={product}
                        editing={editingProductId === product.id}
                        submitting={savingProduct}
                        copy={t}
                        onStartEdit={() => setEditingProductId(product.id)}
                        onCancelEdit={cancelEdit}
                        onSave={saveProduct}
                        onRequestDelete={() => setPendingDelete(product)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.backRow}>
              <a href="/dashboard/suppliers" className={styles.backLink}>
                {t.backToList}
              </a>
            </div>
          </>
        )}
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />

      <ConfirmDialog
        open={!!pendingDelete}
        message={
          pendingDelete
            ? t.confirmDeleteProduct.replace(
                "{name}",
                pendingDelete.nameCn || pendingDelete.designationFr || "—",
              )
            : ""
        }
        confirmLabel={deleting ? t.deleting : t.yes}
        cancelLabel={t.no}
        onConfirm={confirmDeleteProduct}
        onCancel={() => (deleting ? null : setPendingDelete(null))}
      />
    </main>
  );
}
