"use client";

import type { TitleCatalogItem, TitleFrameSize } from "@/types/title";
import { TitleFrameSvg } from "@/components/titles/TitleFrameSvg";
import styles from "@/components/titles/title-components.module.css";

export interface TitleCardProps {
  title: string;
  item: TitleCatalogItem;
  subtitle?: string;
  locked?: boolean;
  selected?: boolean;
  progress?: number;
  size?: TitleFrameSize;
  onSelect?: (titleId: string) => void;
}

export function TitleCard({
  title,
  item,
  subtitle,
  locked = false,
  selected = false,
  progress,
  size = "md",
  onSelect,
}: TitleCardProps) {
  return (
    <button
      type="button"
      className={`${styles.titleCard} ${selected ? styles.titleCardSelected : ""}`}
      disabled={locked}
      onClick={() => {
        if (!locked) onSelect?.(item.id);
      }}
    >
      <TitleFrameSvg
        category={item.category}
        rarity={item.rarity}
        iconType={item.iconType}
        locked={locked}
        selected={selected}
        size={size}
        progress={progress}
        stableId={item.id}
      />
      <span className={styles.titleContent}>
        <span className={styles.titleMeta}>
          {item.level ? `Lv.${item.level}` : item.category} · {item.rarity}
        </span>
        <span className={styles.titleLabel}>{title}</span>
        {subtitle ? <span className={styles.titleSub}>{subtitle}</span> : null}
      </span>
    </button>
  );
}
