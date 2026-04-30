import { Suspense } from "react";

import TrainingMaterialPlayerPage from "@/features/training/pages/TrainingMaterialPlayerPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrainingMaterialPlayerPage />
    </Suspense>
  );
}
