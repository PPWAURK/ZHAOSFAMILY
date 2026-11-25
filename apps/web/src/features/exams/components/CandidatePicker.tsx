"use client";

import { useState, type FormEvent } from "react";
import type { ExamSessionCandidate } from "@zhao/types";

import { fetchRestaurants } from "@/features/stores/services/restaurantsApi";

import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import type { ExamSessionCopy } from "../constants/exam-session-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { addRegistrations, fetchCandidates } from "../services/examSessionsApi";

type CandidatePickerProps = {
  sessionId: number;
  copy: ExamSessionCopy;
  lang: ExamUiLanguage;
  onAdded: () => void;
};

/** Examiner searches employees by store / position / name and adds them to the roster. */
export default function CandidatePicker({ sessionId, copy, lang, onAdded }: CandidatePickerProps) {
  const text = copy.registration;
  const stores = useAsyncData(fetchRestaurants, []);
  const [restaurantId, setRestaurantId] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [name, setName] = useState("");
  const [results, setResults] = useState<ExamSessionCandidate[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const addable = (results ?? []).filter((c) => !c.isRegistered);

  const search = async (event?: FormEvent) => {
    event?.preventDefault();
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      setResults(
        await fetchCandidates({
          sessionId,
          restaurantId: restaurantId ? Number(restaurantId) : undefined,
          jobRole: jobRole.trim() || undefined,
          q: name.trim() || undefined,
        }),
      );
      setSelected(new Set());
    } catch (reason) {
      setError(describeExamError(reason, lang));
    } finally {
      setIsBusy(false);
    }
  };

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(selected.size === addable.length ? new Set() : new Set(addable.map((c) => c.id)));

  const addSelected = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const { added } = await addRegistrations(sessionId, [...selected]);
      setMessage(text.added(added));
      onAdded();
      await search();
    } catch (reason) {
      setError(describeExamError(reason, lang));
      setIsBusy(false);
    }
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.sectionTitle} style={{ marginTop: 0 }}>
        {text.addTitle}
      </h3>
      <form className={styles.formGrid} onSubmit={(event) => void search(event)}>
        <label className={styles.field}>
          {text.allStores}
          <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
            <option value="">{text.allStores}</option>
            {(stores.data ?? []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {text.searchRole}
          <input value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
        </label>
        <label className={styles.field}>
          {text.searchName}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit" className={styles.button} disabled={isBusy}>
          {text.search}
        </button>
      </form>
      {results?.length === 0 ? <p className={styles.muted}>{text.noResults}</p> : null}
      {results?.length ? (
        <>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={toggleAll}>
              {text.selectAll}
            </button>
            <button
              type="button"
              className={styles.buttonPrimary}
              disabled={isBusy || selected.size === 0}
              onClick={() => void addSelected()}
            >
              {text.addSelected(selected.size)}
            </button>
          </div>
          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <tbody>
                {results.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={c.name}
                        disabled={c.isRegistered}
                        checked={c.isRegistered || selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                    </td>
                    <td>{c.name}</td>
                    <td>{c.restaurant.name}</td>
                    <td>{c.jobRole ?? "—"}</td>
                    <td>{c.isRegistered ? text.alreadyAdded : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {message ? <p className={styles.muted}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
