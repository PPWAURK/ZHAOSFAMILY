import Link from "next/link";

import type { FolderCourse } from "@/features/training/utils/trainingFolders";

import styles from "./training-folders.module.css";

const COURSE_GLYPHS: Record<string, string> = {
  VIDEO: "影",
  PDF: "册",
  QUIZ: "测",
  ARTICLE: "文",
  IMAGE: "图",
  OTHER: "件",
};

export interface CourseCardData extends FolderCourse {
  type: string;
  dur?: string;
  prog: number;
  desc?: string;
}

interface CourseCardProps {
  course: CourseCardData;
  statusLabel: string;
  requiredLabel: string;
}

function resolveType(type: string): string {
  return type in COURSE_GLYPHS ? type : "OTHER";
}

export default function CourseCard({
  course,
  statusLabel,
  requiredLabel,
}: CourseCardProps) {
  const type = resolveType(course.type);
  const progress = Math.min(100, Math.max(0, course.prog));

  return (
    <Link
      href={`/dashboard/training/materials/player?id=${course.materialId}`}
      className={styles.card}
    >
      <div className={`${styles.cover} ${styles[`cover${type}`]}`}>
        <div className={styles.coverTags}>
          <span className={styles.kindTag}>{type}</span>
          {course.req ? (
            <span className={styles.requiredTag}>{requiredLabel}</span>
          ) : null}
        </div>
        <span className={styles.glyph} aria-hidden="true">
          {COURSE_GLYPHS[type]}
        </span>
        {type === "VIDEO" ? (
          <span className={styles.play} aria-hidden="true">
            ▶
          </span>
        ) : null}
        {course.dur ? <span className={styles.meta}>{course.dur}</span> : null}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title} title={course.title}>
          {course.title}
        </h3>
        {course.desc ? <p className={styles.desc}>{course.desc}</p> : null}
      </div>
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <i style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.status}>{statusLabel}</span>
      </div>
    </Link>
  );
}
