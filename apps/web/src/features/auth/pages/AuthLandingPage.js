"use client";

import BrandPanel from "@/features/auth/components/BrandPanel";
import GlassAuthPanel from "@/features/auth/components/GlassAuthPanel";
import { useLiaoSwing } from "@/features/auth/hooks/useLiaoSwing";
import styles from "@/features/auth/auth-page.module.css";

export default function AuthLandingPage() {
  const liaoSwing = useLiaoSwing();

  return (
    <main className={styles.page}>
      <BrandPanel liaoSwing={liaoSwing} />
      <GlassAuthPanel />
    </main>
  );
}
