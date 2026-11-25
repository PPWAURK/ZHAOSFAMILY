import { Suspense } from "react";

import ExamTakingPage from "@/features/exams/pages/ExamTakingPage";

// useSearchParams needs a Suspense boundary under the static export.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExamTakingPage />
    </Suspense>
  );
}
