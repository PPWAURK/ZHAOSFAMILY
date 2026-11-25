import type { ExamCategory } from "@zhao/types";

import styles from "../exams.module.css";

type CategorySelectProps = {
  label: string;
  emptyLabel: string;
  categories: readonly ExamCategory[];
  value: number | null;
  onChange: (categoryId: number | null) => void;
};

/** Exam category picker; the empty option means "no category". */
export default function CategorySelect({
  label,
  emptyLabel,
  categories,
  value,
  onChange,
}: CategorySelectProps) {
  return (
    <label className={styles.field}>
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">{emptyLabel}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameZh} / {c.nameFr}
          </option>
        ))}
      </select>
    </label>
  );
}
