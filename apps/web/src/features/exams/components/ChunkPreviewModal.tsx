"use client";

import { useState } from "react";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchKnowledgeChunks } from "../services/knowledgeBaseApi";
import Pagination from "./Pagination";

const PAGE_SIZE = 10;

type ChunkPreviewModalProps = {
  materialId: number;
  title: string;
  copy: ExamBankCopy;
  onClose: () => void;
};

export default function ChunkPreviewModal({
  materialId,
  title,
  copy,
  onClose,
}: ChunkPreviewModalProps) {
  const [page, setPage] = useState(1);
  const chunks = useAsyncData(
    () => fetchKnowledgeChunks(materialId, page, PAGE_SIZE),
    [materialId, page],
  );

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={copy.knowledge.chunkTitle}
    >
      <div className={styles.modal}>
        <h2>
          {copy.knowledge.chunkTitle} · {title}
        </h2>
        {chunks.isLoading ? <p className={styles.muted}>{copy.loading}</p> : null}
        {chunks.error ? <p className={styles.error}>{copy.loadError}</p> : null}
        {chunks.data?.items.map((chunk) => (
          <pre key={chunk.id} className={styles.chunk}>
            <span className={styles.muted}>
              #{chunk.ordinal + 1} · ~{chunk.tokenEstimate} tokens
            </span>
            {"\n"}
            {chunk.content}
          </pre>
        ))}
        {chunks.data ? (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={chunks.data.total}
            labels={copy}
            onChange={setPage}
          />
        ) : null}
        <button type="button" className={styles.button} onClick={onClose}>
          {copy.close}
        </button>
      </div>
    </div>
  );
}
