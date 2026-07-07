"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";

import { canSeeNavEntry } from "@zhao/utils";

import { useAuth } from "@/features/auth/context/AuthContext";
import { fetchTrainingMyTitles } from "@/features/training/services/trainingMediaApi";
import {
  DASHBOARD_NAV,
  DASHBOARD_NAV_GROUP_LABELS,
  DASHBOARD_MENU_LABELS,
  USER_CARD_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import styles from "@/features/dashboard/dashboard-page.module.css";

const TITLE_FRAME_CLASS_BY_STYLE = {
  red: "sidebarTitleFrameRed",
  gold: "sidebarTitleFrameGold",
  ink: "sidebarTitleFrameInk",
  jade: "sidebarTitleFrameJade",
  blue: "sidebarTitleFrameBlue",
  purple: "sidebarTitleFramePurple",
};

function resolveUserCard(user, labels) {
  const firstName = user?.firstName || user?.givenName || "";
  const lastName = user?.lastName || user?.familyName || user?.surname || "";
  const composedName = [lastName, firstName].filter(Boolean).join(" ").trim();
  const fullName = composedName || user?.name?.trim() || labels.noName;

  const store =
    user?.store?.name ||
    user?.storeName ||
    user?.establishment ||
    labels.noStore;

  // role / position / jobRole pointent tous vers la même colonne `job_role`,
  // qui peut contenir plusieurs postes séparés par des virgules. On dé-duplique
  // et on normalise l'affichage en une seule liste lisible.
  const jobRoleParts = Array.from(
    new Set(
      `${user?.jobRole || user?.position || user?.role || ""}`
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
  const role = jobRoleParts.join(" · ") || labels.noRole;

  const avatar = user?.avatarUrl || user?.avatar || null;
  const initials = fullName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return { fullName, store, role, avatar, initials };
}

function getTrainingTitleName(title, lang) {
  return title?.name?.[lang] || title?.name?.zh || title?.code || "";
}

function getSidebarTitleFrameClass(title) {
  const frameClass =
    TITLE_FRAME_CLASS_BY_STYLE[title?.frameStyle] || TITLE_FRAME_CLASS_BY_STYLE.red;

  return `${styles.sidebarTitleFrame} ${styles[frameClass]}`;
}

export default function Sidebar({ open, onClose, lang }) {
  const { user } = useAuth();
  const [equippedTitle, setEquippedTitle] = useState(null);
  const groupLabels = DASHBOARD_NAV_GROUP_LABELS[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const userLabels = USER_CARD_LABELS[lang];
  const userCard = resolveUserCard(user, userLabels);
  const visibleNavGroups = DASHBOARD_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavEntry(user, item)),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    let isActive = true;

    async function loadEquippedTitle() {
      if (!open || !user?.id) return;

      try {
        const myTitles = await fetchTrainingMyTitles();
        if (isActive) setEquippedTitle(myTitles.equippedTitle ?? null);
      } catch {
        if (isActive) setEquippedTitle(null);
      }
    }

    void loadEquippedTitle();

    return () => {
      isActive = false;
    };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open) return;

    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="backdrop"
            type="button"
            aria-label={menuLabels.close}
            className={styles.backdrop}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.aside
            key="sidebar"
            className={styles.sidebar}
            role="dialog"
            aria-label={menuLabels.title}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.sidebarTop}>
              <span className={styles.sidebarBrand}>
                <span className={styles.sidebarBrandBold}>ZHAO</span>
                &nbsp;/&nbsp;FAMILY
              </span>
              <button
                type="button"
                className={styles.sidebarClose}
                onClick={onClose}
              >
                {menuLabels.close} ×
              </button>
            </div>

            <section className={styles.userCard} aria-label={userLabels.kicker}>
              <p className={styles.userCardKicker}>
                <span className={styles.kickerDot} />
                {userLabels.kicker}
              </p>

              <div className={styles.userCardBody}>
                <div className={styles.userCardAvatar}>
                  {userCard.avatar ? (
                    <img src={userCard.avatar} alt={userCard.fullName} />
                  ) : (
                    <span className={styles.userCardInitials}>
                      {userCard.initials || "Z"}
                    </span>
                  )}
                </div>

                <div className={styles.userCardIdentity}>
                  <h2 className={styles.userCardName}>{userCard.fullName}</h2>
                  {equippedTitle ? (
                    <span className={getSidebarTitleFrameClass(equippedTitle)}>
                      {getTrainingTitleName(equippedTitle, lang)}
                    </span>
                  ) : null}
                  <p className={styles.userCardMetaHint}>{menuLabels.hint}</p>
                </div>
              </div>

              <dl className={styles.userCardMeta}>
                <div className={styles.userCardMetaRow}>
                  <dt>{userLabels.storeLabel}</dt>
                  <dd>{userCard.store}</dd>
                </div>
                <div className={styles.userCardMetaRow}>
                  <dt>{userLabels.roleLabel}</dt>
                  <dd>{userCard.role}</dd>
                </div>
              </dl>
            </section>

            <nav className={styles.navGroups}>
              {visibleNavGroups.map((group) => (
                <div key={group.id} className={styles.navGroup}>
                  <p className={styles.navGroupLabel}>{groupLabels[group.id]}</p>
                  <ul className={styles.navList}>
                    {group.items.map((item, index) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className={styles.navItem}
                          onClick={onClose}
                        >
                          <span className={styles.navItemIndex}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className={styles.navItemLabel}>{item[lang]}</span>
                          <span className={styles.navItemArrow} aria-hidden="true">
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <p className={styles.sidebarFooter}>Since 2011 · ZHAO's Family</p>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
