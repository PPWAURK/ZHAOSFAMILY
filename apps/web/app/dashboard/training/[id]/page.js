import TrainingCoursePage from "@/features/training/pages/TrainingCoursePage";
import { TRAINING_COURSES } from "@/features/training/constants/training-copy";

export function generateStaticParams() {
  return [...TRAINING_COURSES.required, ...TRAINING_COURSES.optional].map(
    (course) => ({ id: course.id }),
  );
}

export default function Page({ params }) {
  return <TrainingCoursePage courseId={params.id} />;
}
