import type { ExamCategory, ExamPoolCheck, KnowledgeMaterial } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import styles from "../exams.module.css";
import { EXAM_DIFFICULTIES } from "../utils/difficultyTargets";
import type { TemplateDraft } from "../utils/templateDraft";

const toggleIn = <T,>(list: readonly T[] | null, value: T): T[] =>
  (list ?? []).includes(value) ? (list ?? []).filter((v) => v !== value) : [...(list ?? []), value];

export const optionalInt = (value: string): number | null => (value.trim() ? Number(value) : null);

type SimplePoolFieldsProps = {
  draft: TemplateDraft;
  categories: ExamCategory[];
  materials: KnowledgeMaterial[];
  copy: ExamBankCopy;
  pool: ExamPoolCheck | null;
  onChange: (patch: Partial<TemplateDraft>) => void;
};

/** Simple template: counts per type, time limit and the draw scope filters. */
export default function SimplePoolFields({
  draft,
  categories,
  materials,
  copy,
  pool,
  onChange,
}: SimplePoolFieldsProps) {
  const labels = copy.templates;
  const isInsufficient = pool !== null && !pool.isSufficient;

  return (
    <>
      <h3 className={styles.field}>{labels.counts}</h3>
      <div className={styles.formGrid}>
        {(["single", "multiple", "boolean"] as const).map((type) => {
          const key = `${type}Count` as const;
          return (
            <label key={type} className={styles.field}>
              {copy.types[type]}
              <input
                type="number"
                min={0}
                max={200}
                value={draft[key]}
                onChange={(e) => onChange({ [key]: Number(e.target.value) })}
              />
            </label>
          );
        })}
        <label className={styles.field}>
          {labels.timeLimit}
          <input
            type="number"
            min={1}
            max={600}
            value={draft.timeLimitMinutes ?? ""}
            onChange={(e) => onChange({ timeLimitMinutes: optionalInt(e.target.value) })}
          />
        </label>
      </div>
      {pool ? (
        <p className={isInsufficient ? styles.error : styles.notice}>
          {labels.poolCheck(pool.available.single, pool.available.multiple, pool.available.boolean)}
          {isInsufficient ? ` ${labels.insufficient}` : ""}
        </p>
      ) : null}

      <p className={styles.field}>{labels.categories}</p>
      <div className={styles.checkList}>
        {categories.map((c) => (
          <label key={c.id} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={draft.categoryIds?.includes(c.id) ?? false}
              onChange={() => onChange({ categoryIds: toggleIn(draft.categoryIds, c.id) })}
            />
            {c.nameZh} / {c.nameFr}
          </label>
        ))}
      </div>
      <p className={styles.field}>{labels.materials}</p>
      <div className={styles.checkList}>
        {materials.map((m) => (
          <label key={m.id} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={draft.materialIds?.includes(m.id) ?? false}
              onChange={() => onChange({ materialIds: toggleIn(draft.materialIds, m.id) })}
            />
            {m.title}
          </label>
        ))}
      </div>
      <p className={styles.field}>{labels.difficulties}</p>
      <div className={styles.checkList}>
        {EXAM_DIFFICULTIES.map((d) => (
          <label key={d} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={draft.difficulties?.includes(d) ?? false}
              onChange={() => onChange({ difficulties: toggleIn(draft.difficulties, d) })}
            />
            {copy.difficulties[d]}
          </label>
        ))}
      </div>
    </>
  );
}
