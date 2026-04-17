"use client";

import BrandPanel from "@/app/_components/BrandPanel";
import GlassAuthPanel from "@/app/_components/GlassAuthPanel";
import { useLiaoSwing } from "@/app/_hooks/useLiaoSwing";

import styles from "./page.module.css";

export default function AuthPage() {
  const liaoSwing = useLiaoSwing();

  return (
    <main className={styles.page}>
      <BrandPanel liaoSwing={liaoSwing} />
      <GlassAuthPanel />
    </main>
  );
}
