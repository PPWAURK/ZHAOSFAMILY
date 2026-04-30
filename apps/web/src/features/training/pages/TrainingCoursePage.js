"use client";

import Link from "next/link";

import TrainingLayout from "@/features/training/components/TrainingLayout";
import {
  TRAINING_COPY,
  TRAINING_COURSES,
} from "@/features/training/constants/training-copy";

const COURSE_GLYPHS = {
  VIDEO: "影",
  PDF: "册",
  QUIZ: "测",
  ARTICLE: "文",
};

const PAGE_COPY = {
  zh: {
    topStage: "课程详情 · COURSE",
    kicker: "ZHAO's · 培训 · 认证 · 资料",
    title: "课程",
    titleEm: "详情",
    titleSuffix: "。",
    lede: "查看课程详情,随时继续你的学习进度。",
  },
  en: {
    topStage: "Course detail · COURSE",
    kicker: "ZHAO's · Training · Certification · Resources",
    title: "Course",
    titleEm: "Detail",
    titleSuffix: ".",
    lede: "Review course details and pick up where you left off.",
  },
  fr: {
    topStage: "Détail cours · COURSE",
    kicker: "ZHAO's · Formation · Certification · Ressources",
    title: "Détail",
    titleEm: "Cours",
    titleSuffix: ".",
    lede: "Consultez les détails du cours et reprenez votre progression.",
  },
};

function findCourse(id) {
  return (
    TRAINING_COURSES.required.find((c) => c.id === id) ||
    TRAINING_COURSES.optional.find((c) => c.id === id) ||
    null
  );
}

export default function TrainingCoursePage({ courseId }) {
  const course = findCourse(courseId);

  return (
    <TrainingLayout
      pageCopy={{
        zh: { shared: TRAINING_COPY.zh.shared, page: PAGE_COPY.zh },
        en: { shared: TRAINING_COPY.en.shared, page: PAGE_COPY.en },
        fr: { shared: TRAINING_COPY.fr.shared, page: PAGE_COPY.fr },
      }}
    >
      {({ t, styles }) => {
        if (!course) {
          return (
            <section className={styles.section}>
              <p className={styles.courseDesc}>{t.shared.empty}</p>
              <Link href="/dashboard/training" className={styles.backLink}>
                ← {t.shared.backHome}
              </Link>
            </section>
          );
        }

        const glyph = COURSE_GLYPHS[course.type];
        const actionLabel =
          t.shared.courseAction?.[course.status] ??
          t.shared.courseAction.not_started;

        return (
          <section className={styles.section}>
            <div className={styles.courseCard} style={{ maxWidth: 560 }}>
              <div
                className={`${styles.courseCover} ${styles[`courseCover${course.type}`]}`}
              >
                <span className={styles.courseKind}>{course.type}</span>
                {course.req && (
                  <span className={styles.courseReq}>
                    {t.shared.materialFilters.req}
                  </span>
                )}
                <span className={styles.courseGlyph}>{glyph}</span>
                <span className={styles.courseDuration}>{course.dur}</span>
              </div>

              <div className={styles.courseBody}>
                <h2 className={styles.courseTitle}>{course.title}</h2>
                <p className={styles.courseTitleEn}>{course.en}</p>
                <p className={styles.courseDesc}>{course.desc}</p>

                {course.tags?.length > 0 && (
                  <div className={styles.courseTags}>
                    {course.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}

                <div className={styles.courseProgress}>
                  <div
                    className={styles.courseProgressBar}
                    style={{ width: `${course.prog}%` }}
                  />
                </div>
                <p className={styles.courseKind} style={{ margin: "4px 0 20px" }}>
                  {course.prog}% · {t.shared.courseStatus[course.status]}
                </p>

                <button type="button" className={styles.onboardingAction}>
                  <span>{actionLabel}</span>
                  <span className={styles.onboardingArrow}>→</span>
                </button>
              </div>
            </div>

            <div className={styles.backRow}>
              <Link href="/dashboard/training" className={styles.backLink}>
                ← {t.shared.backHome}
              </Link>
            </div>
          </section>
        );
      }}
    </TrainingLayout>
  );
}
