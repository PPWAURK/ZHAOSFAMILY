"use client";

import { useCallback, useRef, useState } from "react";

import styles from "@/features/dashboard/dashboard-page.module.css";

// --- Text insertion helpers ---

function insertAtCursor(textarea, text, currentValue, onChange) {
  const start = textarea?.selectionStart ?? currentValue.length;
  const end = textarea?.selectionEnd ?? currentValue.length;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const nextValue = `${before}${text}${after}`;
  const cursor = `${before}${text}`.length;

  onChange(nextValue);

  window.requestAnimationFrame(() => {
    textarea?.focus();
    textarea?.setSelectionRange(cursor, cursor);
  });
}

function wrapSelection(textarea, currentValue, onChange, prefix, suffix) {
  const start = textarea?.selectionStart ?? currentValue.length;
  const end = textarea?.selectionEnd ?? currentValue.length;
  const selected = currentValue.slice(start, end);

  if (selected) {
    const nextValue = `${currentValue.slice(0, start)}${prefix}${selected}${suffix}${currentValue.slice(end)}`;
    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length,
      );
    });
  } else {
    insertAtCursor(textarea, `${prefix}${suffix}`, currentValue, onChange);
  }
}

function insertAtLineStart(textarea, currentValue, onChange, block) {
  const start = textarea?.selectionStart ?? currentValue.length;
  const lineStart =
    start === 0 ? 0 : currentValue.lastIndexOf("\n", start - 1) + 1;
  const nextValue =
    currentValue.slice(0, lineStart) +
    block +
    currentValue.slice(lineStart);
  const cursor = lineStart + block.length;

  onChange(nextValue);

  window.requestAnimationFrame(() => {
    textarea?.focus();
    textarea?.setSelectionRange(cursor, cursor);
  });
}

// --- Toolbar configuration ---

const EDITOR_ACTIONS = [
  [
    { id: "bold", label: "B", prefix: "**", suffix: "**", title: "Bold" },
    { id: "italic", label: "I", prefix: "*", suffix: "*", title: "Italic" },
    {
      id: "heading",
      label: "H",
      prefix: "## ",
      block: true,
      title: "Heading",
    },
  ],
  [
    {
      id: "bulletList",
      label: "\u2022",
      prefix: "- ",
      block: true,
      title: "Bullet list",
    },
    {
      id: "numberedList",
      label: "1.",
      prefix: "1. ",
      block: true,
      title: "Numbered list",
    },
  ],
  [
    { id: "link", label: "Link", title: "Insert link" },
    { id: "image", label: "Img", title: "Insert image", isImage: true },
    {
      id: "divider",
      label: "\u2014",
      insert: "\n---\n",
      title: "Horizontal rule",
    },
  ],
  [{ id: "preview", label: "Preview", title: "Toggle preview", toggle: true }],
];

export default function DashboardNewsMarkdownEditor({
  value,
  onChange,
  placeholder,
  maxLength,
  onImageUpload,
  isUploadingImage,
  imageLabels,
  previewRenderer,
}) {
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [mode, setMode] = useState("edit");

  const handleAction = useCallback(
    (action) => {
      if (action.toggle) {
        setMode((prev) => (prev === "edit" ? "preview" : "edit"));
        return;
      }

      if (action.isImage) {
        imageInputRef.current?.click();
        return;
      }

      if (action.id === "link") {
        const url = window.prompt("Enter URL:");

        if (url) {
          const text = url.replace(/^https?:\/\//, "");
          insertAtCursor(
            textareaRef.current,
            `[${text}](${url})`,
            value,
            onChange,
          );
        }

        return;
      }

      if (action.insert) {
        insertAtCursor(
          textareaRef.current,
          action.insert,
          value,
          onChange,
        );
        return;
      }

      if (action.block) {
        insertAtLineStart(
          textareaRef.current,
          value,
          onChange,
          action.prefix,
        );
        return;
      }

      wrapSelection(
        textareaRef.current,
        value,
        onChange,
        action.prefix,
        action.suffix,
      );
    },
    [value, onChange],
  );

  const handleImageFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];

      setFileInputKey((prev) => prev + 1);

      if (!file || !onImageUpload) {
        return;
      }

      try {
        const markdown = await onImageUpload(file);

        if (markdown) {
          insertAtCursor(textareaRef.current, markdown, value, onChange);
        }
      } catch {
        /* parent handles errors */
      }
    },
    [onImageUpload, value, onChange],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        const textarea = textareaRef.current;

        if (textarea) {
          const cursor = textarea.selectionStart;
          const lineStart =
            cursor === 0 ? 0 : value.lastIndexOf("\n", cursor - 1) + 1;
          const currentLine = value.slice(lineStart, cursor);

          const numberMatch = currentLine.match(/^(\d+)\.\s*(.*)$/);

          if (numberMatch) {
            event.preventDefault();
            const lineContent = numberMatch[2];

            if (lineContent.trim()) {
              const nextNumber = parseInt(numberMatch[1], 10) + 1;
              insertAtCursor(textarea, `\n${nextNumber}. `, value, onChange);
            } else {
              insertAtCursor(textarea, "\n", value, onChange);
            }

            return;
          }

          const bulletMatch = currentLine.match(/^([-*])\s*(.*)$/);

          if (bulletMatch) {
            event.preventDefault();
            const lineContent = bulletMatch[2];

            if (lineContent.trim()) {
              insertAtCursor(textarea, `\n${bulletMatch[1]} `, value, onChange);
            } else {
              insertAtCursor(textarea, "\n", value, onChange);
            }

            return;
          }
        }
      }

      if (event.key === "Tab") {
        event.preventDefault();
        insertAtCursor(textareaRef.current, "  ", value, onChange);
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        if (event.key === "b") {
          event.preventDefault();
          wrapSelection(textareaRef.current, value, onChange, "**", "**");
          return;
        }

        if (event.key === "i") {
          event.preventDefault();
          wrapSelection(textareaRef.current, value, onChange, "*", "*");
          return;
        }
      }
    },
    [value, onChange],
  );

  const isImageDisabled =
    isUploadingImage || !onImageUpload;

  // --- Preview mode ---

  if (mode === "preview") {
    return (
      <div className={styles.editorWrapper}>
        <div className={styles.editorToolbar}>
          {EDITOR_ACTIONS.map((group, groupIndex) => (
            <span key={groupIndex} className={styles.editorToolbarGroup}>
              {group.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`${styles.editorToolBtn} ${action.toggle ? styles.editorToolBtnActive : ""}`}
                  onClick={() => handleAction(action)}
                  title={action.title}
                  disabled={action.isImage ? isImageDisabled : false}
                >
                  {action.toggle ? "Edit" : action.label}
                </button>
              ))}
            </span>
          ))}
        </div>
        <div className={styles.editorPreview}>
          {previewRenderer ? (
            previewRenderer(value)
          ) : (
            <p className={styles.editorPreviewFallback}>{value || "\u00a0"}</p>
          )}
        </div>
      </div>
    );
  }

  // --- Edit mode ---

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.editorToolbar}>
        {EDITOR_ACTIONS.map((group, groupIndex) => (
          <span key={groupIndex} className={styles.editorToolbarGroup}>
            {group.map((action) => (
              <button
                key={action.id}
                type="button"
                className={styles.editorToolBtn}
                onClick={() => handleAction(action)}
                title={action.title}
                disabled={action.isImage ? isImageDisabled : false}
              >
                {action.isImage && isUploadingImage
                  ? imageLabels?.uploading || action.label
                  : action.label}
              </button>
            ))}
          </span>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        className={styles.editorTextarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
      />

      <div className={styles.editorFooter}>
        <span className={styles.editorCharCount}>
          {value.length}/{maxLength}
        </span>

        <span className={styles.editorUploadControl}>
          <input
            key={fileInputKey}
            ref={imageInputRef}
            type="file"
            accept="image/*"
            disabled={isUploadingImage}
            onChange={handleImageFileChange}
            tabIndex={-1}
          />
          {imageLabels?.hint ? (
            <small className={styles.editorUploadHint}>
              {imageLabels.hint}
            </small>
          ) : null}
        </span>
      </div>
    </div>
  );
}
