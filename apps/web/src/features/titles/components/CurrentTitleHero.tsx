"use client";

import type { TitleCatalogItem } from "@/types/title";
import { TitleFrameSvg } from "@/features/titles/components/TitleFrameSvg";
import styles from "@/features/titles/components/title-components.module.css";

export interface CurrentTitleHeroProps {
  item: TitleCatalogItem;
  title: string;
  subtitle?: string;
  progress?: number;
}

export function CurrentTitleHero({ item, title, subtitle, progress }: CurrentTitleHeroProps) {
  return (
    <section className={styles.currentHero}>
      <TitleFrameSvg
        category={item.category}
        rarity={item.rarity}
        iconType={item.iconType}
        selected
        size="lg"
        progress={progress}
        stableId={`current-${item.id}`}
      />
      <div className={styles.currentHeroText}>
        <span className={styles.titleMeta}>
          {item.category} · Lv.{item.level ?? "-"} · {item.rarity}
        </span>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </section>
  );
}
