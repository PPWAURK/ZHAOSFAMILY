"use client";

import { Fragment, useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import StoreCard from "@/features/stores/components/StoreCard";
import {
  STORES_COPY,
} from "@/features/stores/constants/stores-copy";
import {
  createRestaurant,
  deleteRestaurant,
  fetchStoresPageStores,
  updateRestaurant,
} from "@/features/stores/services/restaurantsApi";
import styles from "@/features/stores/stores-page.module.css";

const EMPTY_STORE_FORM = {
  name: "",
  address: "",
  photoUrl: "",
};

function getJobRoleValues(user) {
  return `${user?.jobRole || user?.position || user?.role || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function canManageStoreRecords(user) {
  const roleValues = getJobRoleValues(user);

  return (
    roleValues.includes("holding") ||
    (user?.permissions || []).includes("system.permission.manage")
  );
}

export default function StoresPage() {
  const { user } = useAuth();
  const [lang, setLang] = useState("zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storesError, setStoresError] = useState("");
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_STORE_FORM);
  const [formError, setFormError] = useState("");
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [deletingStoreId, setDeletingStoreId] = useState(null);
  const t = STORES_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const count = stores.length;
  const countLabel = count > 1 ? t.countPlural : t.countSingular;
  const canManageStores = canManageStoreRecords(user);

  useEffect(() => {
    let isCancelled = false;

    async function loadStores() {
      try {
        setIsLoadingStores(true);
        setStoresError("");
        const nextStores = await fetchStoresPageStores();

        if (isCancelled) {
          return;
        }

        setStores(nextStores);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStores([]);
        setStoresError(error instanceof Error ? error.message : t.loadError);
      } finally {
        if (!isCancelled) {
          setIsLoadingStores(false);
        }
      }
    }

    void loadStores();

    return () => {
      isCancelled = true;
    };
  }, [t.loadError]);

  function resetStoreForm() {
    setEditingStoreId(null);
    setDraft(EMPTY_STORE_FORM);
    setFormError("");
  }

  function patchDraft(key, value) {
    setFormError("");
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startEditStore(store) {
    setEditingStoreId(store.id);
    setDraft({
      name: store.name,
      address: store.address,
      photoUrl: store.photoUrl || "",
    });
    setFormError("");
  }

  async function handleSaveStore(event) {
    event.preventDefault();
    setFormError("");

    const input = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      photoUrl: draft.photoUrl.trim(),
    };

    if (!input.name || !input.address) {
      setFormError(t.formRequired);
      return;
    }

    setIsSavingStore(true);

    try {
      const savedStore = editingStoreId
        ? await updateRestaurant(editingStoreId, input)
        : await createRestaurant(input);

      setStores((current) => {
        if (!editingStoreId) {
          return [...current, savedStore];
        }

        return current.map((store) =>
          store.id === savedStore.id ? savedStore : store,
        );
      });
      resetStoreForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.saveError);
    } finally {
      setIsSavingStore(false);
    }
  }

  async function handleDeleteStore(store) {
    const confirmed = window.confirm(t.deleteConfirm);

    if (!confirmed) {
      return;
    }

    setDeletingStoreId(store.id);
    setStoresError("");

    try {
      await deleteRestaurant(store.id);
      setStores((current) => current.filter((item) => item.id !== store.id));

      if (editingStoreId === store.id) {
        resetStoreForm();
      }
    } catch (error) {
      setStoresError(error instanceof Error ? error.message : t.deleteError);
    } finally {
      setDeletingStoreId(null);
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

        <h1 className={styles.title}>
          {t.title}
          <span className={styles.titleEm}>{t.titleEm}</span>
          {t.titleSuffix}
        </h1>

        <p className={styles.lede}>{t.lede}</p>

        {canManageStores ? (
          <form className={styles.formPanel} onSubmit={handleSaveStore}>
            <div className={styles.formHead}>
              <h2 className={styles.formTitle}>
                {editingStoreId ? t.formTitleEdit : t.formTitleCreate}
              </h2>
              {editingStoreId ? (
                <button
                  type="button"
                  className={styles.formGhostButton}
                  onClick={resetStoreForm}
                >
                  {t.cancel}
                </button>
              ) : null}
            </div>

            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{t.nameLabel}</span>
                <input
                  value={draft.name}
                  onChange={(event) => patchDraft("name", event.target.value)}
                  placeholder={t.namePlaceholder}
                  disabled={isSavingStore}
                />
              </label>

              <label className={styles.formField}>
                <span>{t.addressLabel}</span>
                <input
                  value={draft.address}
                  onChange={(event) => patchDraft("address", event.target.value)}
                  placeholder={t.addressLabel}
                  disabled={isSavingStore}
                />
              </label>

              <label className={styles.formField}>
                <span>{t.photoLabel}</span>
                <input
                  value={draft.photoUrl}
                  onChange={(event) => patchDraft("photoUrl", event.target.value)}
                  placeholder={t.photoPlaceholder}
                  disabled={isSavingStore}
                />
              </label>

            </div>

            {formError ? (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              className={styles.formPrimaryButton}
              disabled={isSavingStore}
            >
              {editingStoreId ? t.saveEdit : t.saveCreate}
            </button>
          </form>
        ) : null}

        <p className={styles.listHeading}>
          <span>{t.listHeading}</span>
          <span className={styles.listHeadingCount}>
            {count} {countLabel}
          </span>
        </p>

        {isLoadingStores ? (
          <div className={styles.statePanel}>{t.loading}</div>
        ) : null}

        {!isLoadingStores && storesError ? (
          <div className={styles.statePanel} role="alert">
            {storesError}
          </div>
        ) : null}

        {!isLoadingStores && !storesError && stores.length === 0 ? (
          <div className={styles.statePanel}>{t.empty}</div>
        ) : null}

        {!isLoadingStores && !storesError && stores.length > 0 ? (
          <div className={styles.grid}>
            {stores.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                index={index}
                labels={t}
                onEdit={startEditStore}
                onDelete={handleDeleteStore}
                isDeleting={deletingStoreId === store.id}
                canManageStoreRecords={canManageStores}
              />
            ))}
          </div>
        ) : null}

        <div className={styles.backRow}>
          <Link href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </Link>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
