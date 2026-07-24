"use client";

import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { useId, useRef, useState } from "react";

import styles from "@/features/dashboard/dashboard-page.module.css";

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const MAX_TAGS = 8;

type TagInputLabels = {
  add: string;
  limit: string;
  placeholder: string;
  removeTag: string;
};

type AttachmentLabels = {
  hint: string;
  remove: string;
  sizeError: string;
  title: string;
};

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.ceil(size / 1024)} KB`;
}

function getFileKind(file: File): string {
  const mimeType = file?.type?.toLowerCase() || "";
  const name = file?.name?.toLowerCase() || "";

  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType.startsWith("video/")) return "VID";
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (name.match(/\.(xlsx?|csv)$/)) return "XLS";
  if (name.match(/\.(docx?|odt)$/)) return "DOC";
  return "FILE";
}

export function DashboardNewsTagInput({
  value,
  onChange,
  suggestions,
  labels,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  labels: TagInputLabels;
  disabled: boolean;
}) {
  const suggestionListId = useId();
  const [draft, setDraft] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const normalizedDraft = draft.trim().toLowerCase();
  const normalizedTags = new Set(tags.map((tag) => tag.toLowerCase()));
  const matchingSuggestions = suggestions
    .filter((suggestion) => suggestion !== "all")
    .filter((suggestion) => !normalizedTags.has(suggestion.toLowerCase()))
    .filter(
      (suggestion) =>
        !normalizedDraft || suggestion.toLowerCase().includes(normalizedDraft),
    )
    .slice(0, MAX_TAGS);
  const shouldShowSuggestions =
    isSuggestionsOpen && !disabled && matchingSuggestions.length > 0;

  function commitTag(candidate: string): void {
    const nextTag = candidate.trim().replace(/^#+/, "");

    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    if (!nextTag) return;
    if (tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setDraft("");
      return;
    }
    if (tags.length >= MAX_TAGS) return;

    onChange([...tags, nextTag].join(","));
    setDraft("");
  }

  function handleDraftChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextValue = event.target.value;
    const chunks = nextValue.split(/[,，]/);

    if (chunks.length === 1) {
      setDraft(nextValue);
      setIsSuggestionsOpen(true);
      setActiveSuggestionIndex(0);
      return;
    }

    const nextTags = [...tags];
    chunks.slice(0, -1).forEach((candidate) => {
      const nextTag = candidate.trim().replace(/^#+/, "");
      const isDuplicate = nextTags.some(
        (tag) => tag.toLowerCase() === nextTag.toLowerCase(),
      );

      if (nextTag && !isDuplicate && nextTags.length < MAX_TAGS) {
        nextTags.push(nextTag);
      }
    });
    onChange(nextTags.join(","));
    setDraft(chunks.at(-1) || "");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (
      (event.key === "ArrowDown" || event.key === "ArrowUp") &&
      matchingSuggestions.length > 0
    ) {
      event.preventDefault();
      setIsSuggestionsOpen(true);
      setActiveSuggestionIndex((currentIndex) => {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          currentIndex < 0 ? 0 : currentIndex + direction;

        return (
          (nextIndex + matchingSuggestions.length) %
          matchingSuggestions.length
        );
      });
      return;
    }

    if (event.key === "Escape") {
      setIsSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const activeSuggestion = shouldShowSuggestions
        ? matchingSuggestions[activeSuggestionIndex]
        : "";
      commitTag(activeSuggestion || draft);
      return;
    }

    if (event.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1).join(","));
    }
  }

  return (
    <div className={styles.tagInput} data-disabled={disabled ? "true" : "false"}>
      {tags.map((tag) => (
        <span key={tag} className={styles.tagChip}>
          {tag}
          <button
            type="button"
            onClick={() =>
              onChange(tags.filter((currentTag) => currentTag !== tag).join(","))
            }
            aria-label={`${labels.removeTag} ${tag}`}
            disabled={disabled}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={handleDraftChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsSuggestionsOpen(true);
          setActiveSuggestionIndex(0);
        }}
        onBlur={() => commitTag(draft)}
        placeholder={tags.length === 0 ? labels.placeholder : labels.add}
        aria-label={labels.placeholder}
        aria-activedescendant={
          shouldShowSuggestions && activeSuggestionIndex >= 0
            ? `${suggestionListId}-${activeSuggestionIndex}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={suggestionListId}
        aria-expanded={shouldShowSuggestions}
        role="combobox"
        disabled={disabled || tags.length >= MAX_TAGS}
      />
      {shouldShowSuggestions ? (
        <div
          id={suggestionListId}
          className={styles.tagSuggestions}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
        >
          {matchingSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              id={`${suggestionListId}-${index}`}
              type="button"
              className={styles.tagSuggestion}
              role="option"
              aria-selected={index === activeSuggestionIndex}
              onMouseEnter={() => setActiveSuggestionIndex(index)}
              onClick={() => commitTag(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <small>{labels.limit.replace("{count}", String(tags.length))}</small>
    </div>
  );
}

export function DashboardNewsAttachmentDropzone({
  file,
  onChange,
  labels,
  disabled,
  inputKey,
  onError,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  labels: AttachmentLabels;
  disabled: boolean;
  inputKey: number;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(nextFile?: File): void {
    if (!nextFile) return;

    if (nextFile.size > MAX_ATTACHMENT_BYTES) {
      onError(labels.sizeError);
      return;
    }

    onError("");
    onChange(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) selectFile(event.dataTransfer.files?.[0]);
  }

  if (file) {
    return (
      <div className={styles.attachmentFileRow}>
        <span className={styles.attachmentFileIcon} aria-hidden="true">
          {getFileKind(file)}
        </span>
        <span className={styles.attachmentFileDetails}>
          <strong>{file.name}</strong>
          <small>{formatFileSize(file.size)}</small>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label={labels.remove}
        >
          {labels.remove}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${styles.attachmentDropzone} ${
        isDragging ? styles.attachmentDropzoneActive : ""
      }`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={(event) => {
        if (event.target !== inputRef.current && !disabled) {
          inputRef.current?.click();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        key={inputKey}
        ref={inputRef}
        type="file"
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      <span className={styles.attachmentDropzoneIcon} aria-hidden="true">
        ↥
      </span>
      <strong>{labels.title}</strong>
      <small>{labels.hint}</small>
    </div>
  );
}
