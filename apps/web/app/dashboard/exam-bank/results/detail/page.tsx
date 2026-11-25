import { Suspense } from "react";

import ExamResultDetailPage from "@/features/exams/pages/ExamResultDetailPage";

// useSearchParams needs a Suspense boundary under the static export.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExamResultDetailPage />
    </Suspense>
  );
}
