import { Suspense } from "react";

import ExamSessionDetailPage from "@/features/exams/pages/ExamSessionDetailPage";

// useSearchParams needs a Suspense boundary under the static export.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExamSessionDetailPage />
    </Suspense>
  );
}
