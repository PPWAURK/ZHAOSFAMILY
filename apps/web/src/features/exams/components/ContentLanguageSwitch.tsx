import type { ExamContentLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";

type ContentLanguageSwitchProps = {
  label: string;
  value: ExamContentLanguage;
  onChange: (value: ExamContentLanguage) => void;
};

const OPTIONS: Array<{ value: ExamContentLanguage; label: string }> = [
  { value: "zh", label: "中文" },
  { value: "fr", label: "Français" },
];

/** Questions exist in Chinese and French; employees pick which one to read. */
export default function ContentLanguageSwitch({
  label,
  value,
  onChange,
}: ContentLanguageSwitchProps) {
  return (
    <div className={styles.actions} role="group" aria-label={label} style={{ margin: "0 0 16px" }}>
      <span className={styles.muted}>{label}:</span>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? styles.buttonPrimary : styles.button}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
