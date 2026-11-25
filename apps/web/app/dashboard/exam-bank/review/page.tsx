import { Suspense } from "react";

import QuestionReviewPage from "@/features/exams/pages/QuestionReviewPage";

// useSearchParams needs a Suspense boundary under the static export.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <QuestionReviewPage />
    </Suspense>
  );
}
