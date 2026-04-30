import { Suspense } from "react";

import TrainingMaterialsPage from "@/features/training/pages/TrainingMaterialsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrainingMaterialsPage />
    </Suspense>
  );
}
