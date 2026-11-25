import { Suspense } from "react";

import ExamResultPage from "@/features/exams/pages/ExamResultPage";

// useSearchParams needs a Suspense boundary under the static export.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExamResultPage />
    </Suspense>
  );
}
