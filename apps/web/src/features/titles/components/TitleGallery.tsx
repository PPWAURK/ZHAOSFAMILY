"use client";

import type { TitleCatalogItem } from "@/types/title";
import { TITLE_CATEGORY_ORDER } from "@/types/title";
import { TitleCard } from "@/features/titles/components/TitleCard";
import styles from "@/features/titles/components/title-components.module.css";

export interface TitleGalleryProps {
  titles: readonly TitleCatalogItem[];
  getTitleLabel: (item: TitleCatalogItem) => string;
  getSubtitle?: (item: TitleCatalogItem) => string | undefined;
  selectedTitleId?: string;
  lockedTitleIds?: readonly string[];
  progressByTitleId?: Record<string, number>;
  onSelect?: (titleId: string) => void;
}

function groupTitles(titles: readonly TitleCatalogItem[]) {
  return titles.reduce<Record<string, TitleCatalogItem[]>>((groups, item) => {
    groups[item.category] = [...(groups[item.category] ?? []), item];
    return groups;
  }, {});
}

export function TitleGallery({
  titles,
  getTitleLabel,
  getSubtitle,
  selectedTitleId,
  lockedTitleIds = [],
  progressByTitleId = {},
  onSelect,
}: TitleGalleryProps) {
  const groups = groupTitles(titles);
  const lockedSet = new Set(lockedTitleIds);

  return (
    <div className={styles.titleGallery}>
      {TITLE_CATEGORY_ORDER.map((category) => {
        const items = groups[category] ?? [];
        if (items.length === 0) return null;

        return (
          <section key={category} className={styles.titleGroup}>
            <header className={styles.titleGroupHeader}>
              <h2>{category}</h2>
              <span>{items.length}</span>
            </header>
            <div className={styles.titleGrid}>
              {items.map((item) => (
                <TitleCard
                  key={item.id}
                  item={item}
                  title={getTitleLabel(item)}
                  subtitle={getSubtitle?.(item)}
                  selected={selectedTitleId === item.id}
                  locked={lockedSet.has(item.id)}
                  progress={progressByTitleId[item.id]}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
