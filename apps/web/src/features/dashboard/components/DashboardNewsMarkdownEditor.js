"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  applyEditorBlockStyle,
  applyEditorRangeStyle,
  normalizeEditorLinkUrl,
  parseMarkdownImage,
  placeEditorCaretAtEnd,
  restoreEditorSelection,
  serializeEditorContent,
} from "@/features/dashboard/components/dashboardNewsEditorSerialization";
import styles from "@/features/dashboard/dashboard-page.module.css";

const VisualEditorCanvas = forwardRef(function VisualEditorCanvas(
  {
    value,
    onChange,
    placeholder,
    maxLength,
    previewRenderer,
    inlineOnly = false,
    ariaLabel,
    onFocus,
    showCount = true,
    warningThreshold,
    footerStatus,
  },
  forwardedRef,
) {
  const editorRef = useRef(null);
  const hydrationSourceRef = useRef(null);
  const savedRangeRef = useRef(null);
  const lastEmittedValueRef = useRef(null);
  const lastValidHtmlRef = useRef("");
  const [isEmpty, setIsEmpty] = useState(!value.trim());
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [visibleLength, setVisibleLength] = useState(0);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0 ||
      !editor.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      return;
    }
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return false;
    const nextValue = serializeEditorContent(editor, inlineOnly);
    if (nextValue.length > maxLength) {
      editor.innerHTML = lastValidHtmlRef.current;
      placeEditorCaretAtEnd(editor);
      setLimitExceeded(true);
      return false;
    }
    lastValidHtmlRef.current = editor.innerHTML;
    lastEmittedValueRef.current = nextValue;
    setIsEmpty(!nextValue);
    setLimitExceeded(false);
    setVisibleLength(
      (editor.textContent || "").replaceAll("\u200b", "").length,
    );
    onChange(nextValue);
    saveSelection();
    return true;
  }, [inlineOnly, maxLength, onChange, saveSelection]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    const source = hydrationSourceRef.current;
    if (!editor || !source || value === lastEmittedValueRef.current) {
      return;
    }
    editor.innerHTML = source.innerHTML;
    lastValidHtmlRef.current = editor.innerHTML;
    lastEmittedValueRef.current = value;
    setIsEmpty(!value.trim());
    setLimitExceeded(false);
    setVisibleLength(
      (source.textContent || "").replaceAll("\u200b", "").length,
    );
  }, [value]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      applyTextStyle(size, weight) {
        const editor = editorRef.current;
        if (!editor) return false;
        restoreEditorSelection(editor, savedRangeRef.current);
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        applyEditorRangeStyle(selection.getRangeAt(0), size, weight);
        return emitChange();
      },
      applyBlockStyle(blockStyle) {
        const editor = editorRef.current;
        if (!editor) return false;
        restoreEditorSelection(editor, savedRangeRef.current);
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        applyEditorBlockStyle(editor, selection.getRangeAt(0), blockStyle);
        return emitChange();
      },
      focus() {
        editorRef.current?.focus();
      },
      restoreSelection() {
        const editor = editorRef.current;
        if (editor) restoreEditorSelection(editor, savedRangeRef.current);
      },
      sync() {
        return emitChange();
      },
      insertImage(image) {
        const editor = editorRef.current;
        if (!editor) return false;
        restoreEditorSelection(editor, savedRangeRef.current);
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        img.src = image.src;
        img.alt = image.alt;
        figure.appendChild(img);
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (range) {
          range.insertNode(figure);
          range.setStartAfter(figure);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          editor.appendChild(figure);
        }
        return emitChange();
      },
    }),
    [emitChange],
  );

  function handlePaste(event) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, pastedText);
    emitChange();
  }

  return (
    <>
      <div
        ref={hydrationSourceRef}
        className={styles.editorHydrationSource}
        aria-hidden="true"
      >
        {previewRenderer(value)}
      </div>

      <div
        ref={editorRef}
        className={`${styles.editorCanvas} ${
          inlineOnly ? styles.editorInlineCanvas : ""
        }`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        aria-invalid={limitExceeded}
        aria-placeholder={placeholder}
        data-empty={isEmpty ? "true" : "false"}
        data-placeholder={placeholder}
        onInput={emitChange}
        onFocus={() => {
          onFocus?.();
          saveSelection();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPaste={handlePaste}
        onDrop={(event) => event.preventDefault()}
      />

      {showCount ? (
        <div className={styles.editorCanvasFooter}>
          <span>{footerStatus}</span>
          <span
            className={
              limitExceeded ||
              (warningThreshold && visibleLength >= warningThreshold)
                ? styles.editorCountError
                : ""
            }
          >
            {visibleLength} / {maxLength}
          </span>
        </div>
      ) : null}
    </>
  );
});

export const DashboardNewsInlineEditor = forwardRef(
  function DashboardNewsInlineEditor(
    {
      value,
      onChange,
      placeholder,
      maxLength,
      previewRenderer,
      ariaLabel,
      onFocus,
      warningThreshold,
    },
    ref,
  ) {
    return (
      <div className={styles.editorInlineWrapper}>
        <VisualEditorCanvas
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          previewRenderer={previewRenderer}
          ariaLabel={ariaLabel}
          onFocus={onFocus}
          warningThreshold={warningThreshold}
          inlineOnly
        />
      </div>
    );
  },
);

const DashboardNewsMarkdownEditor = forwardRef(
  function DashboardNewsMarkdownEditor(
    {
      value,
      onChange,
      placeholder,
      maxLength,
      onImageUpload,
      isUploadingImage,
      imageLabels,
      previewRenderer,
      labels,
      ariaLabel,
      onFocus,
      footerStatus,
    },
    ref,
  ) {
    const canvasRef = useRef(null);
    const imageInputRef = useRef(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [blockType, setBlockType] = useState("p");
    const [activeFormats, setActiveFormats] = useState({
      bold: false,
      italic: false,
      underline: false,
      bulletList: false,
      numberedList: false,
    });

    useImperativeHandle(
      ref,
      () => ({
        applyTextStyle(size, weight) {
          return canvasRef.current?.applyTextStyle(size, weight) ?? false;
        },
        focus() {
          canvasRef.current?.focus();
        },
      }),
      [],
    );

    const updateActiveFormats = useCallback(() => {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        bulletList: document.queryCommandState("insertUnorderedList"),
        numberedList: document.queryCommandState("insertOrderedList"),
      });

      const nextBlockType = `${document.queryCommandValue("formatBlock")}`
        .replace(/[<>]/g, "")
        .toLowerCase();
      const selection = window.getSelection();
      const anchorElement =
        selection?.anchorNode?.nodeType === window.Node.ELEMENT_NODE
          ? selection.anchorNode
          : selection?.anchorNode?.parentElement;
      const isCallout = anchorElement?.closest?.(
        "aside[data-zhao-block='callout']",
      );

      if (isCallout) {
        setBlockType("callout");
      } else if (["h2", "h3", "blockquote"].includes(nextBlockType)) {
        setBlockType(nextBlockType);
      } else {
        setBlockType("p");
      }
    }, []);

    const runCommand = useCallback(
      (command, commandValue) => {
        canvasRef.current?.restoreSelection();
        document.execCommand(command, false, commandValue);
        canvasRef.current?.sync();
        updateActiveFormats();
      },
      [updateActiveFormats],
    );

    const applyBlockStyle = useCallback(
      (nextBlockType) => {
        canvasRef.current?.applyBlockStyle(nextBlockType);
        setBlockType(nextBlockType);
        updateActiveFormats();
      },
      [updateActiveFormats],
    );

    const handleLink = useCallback(() => {
      const input = window.prompt(labels.linkPrompt);
      const url = normalizeEditorLinkUrl(input || "");

      if (url) {
        runCommand("createLink", url);
      }
    }, [labels.linkPrompt, runCommand]);

    const handleImageFileChange = useCallback(
      async (event) => {
        const file = event.target.files?.[0];
        setFileInputKey((current) => current + 1);

        if (!file || !onImageUpload) return;

        const markdown = await onImageUpload(file);
        const image = markdown ? parseMarkdownImage(markdown) : null;

        if (!image) return;

        canvasRef.current?.insertImage(image);
      },
      [onImageUpload],
    );

    const isImageDisabled = isUploadingImage || !onImageUpload;

    return (
      <div className={styles.editorWrapper}>
        <div
          className={styles.editorToolbar}
          role="toolbar"
          aria-label={labels.toolbar}
          onMouseDown={(event) => {
            if (event.target.closest?.("button")) {
              event.preventDefault();
            }
          }}
        >
          <span className={styles.editorToolbarGroup}>
            <button
              type="button"
              className={styles.editorToolBtn}
              onClick={() => runCommand("undo")}
              title={labels.undo}
              aria-label={labels.undo}
            >
              ↶
            </button>
            <button
              type="button"
              className={styles.editorToolBtn}
              onClick={() => runCommand("redo")}
              title={labels.redo}
              aria-label={labels.redo}
            >
              ↷
            </button>
          </span>

          <span className={styles.editorToolbarGroup}>
            <select
              className={styles.editorBlockSelect}
              value={blockType}
              onChange={(event) => applyBlockStyle(event.target.value)}
              aria-label={labels.blockStyle}
            >
              <option value="p">{labels.paragraph}</option>
              <option value="h3">{labels.subheading}</option>
              <option value="h2">{labels.heading}</option>
              <option value="blockquote">{labels.quote}</option>
              <option value="callout">{labels.callout}</option>
            </select>
          </span>

          <span className={styles.editorToolbarGroup}>
            <button
              type="button"
              className={`${styles.editorToolBtn} ${
                activeFormats.bold ? styles.editorToolBtnActive : ""
              }`}
              onClick={() => runCommand("bold")}
              title={`${labels.bold} ⌘B`}
              aria-label={labels.bold}
              aria-pressed={activeFormats.bold}
            >
              B
            </button>
            <button
              type="button"
              className={`${styles.editorToolBtn} ${
                activeFormats.italic ? styles.editorToolBtnActive : ""
              }`}
              onClick={() => runCommand("italic")}
              title={`${labels.italic} ⌘I`}
              aria-label={labels.italic}
              aria-pressed={activeFormats.italic}
            >
              I
            </button>
            <button
              type="button"
              className={`${styles.editorToolBtn} ${
                activeFormats.underline ? styles.editorToolBtnActive : ""
              }`}
              onClick={() => runCommand("underline")}
              title={`${labels.underline} ⌘U`}
              aria-label={labels.underline}
              aria-pressed={activeFormats.underline}
            >
              <u>U</u>
            </button>
          </span>

          <span className={styles.editorToolbarGroup}>
            <button
              type="button"
              className={`${styles.editorToolBtn} ${
                activeFormats.bulletList ? styles.editorToolBtnActive : ""
              }`}
              onClick={() => runCommand("insertUnorderedList")}
              title={labels.bulletList}
              aria-label={labels.bulletList}
              aria-pressed={activeFormats.bulletList}
            >
              •
            </button>
            <button
              type="button"
              className={`${styles.editorToolBtn} ${
                activeFormats.numberedList ? styles.editorToolBtnActive : ""
              }`}
              onClick={() => runCommand("insertOrderedList")}
              title={labels.numberedList}
              aria-label={labels.numberedList}
              aria-pressed={activeFormats.numberedList}
            >
              1.
            </button>
            <button
              type="button"
              className={styles.editorToolBtn}
              onClick={handleLink}
              title={labels.link}
            >
              {labels.link}
            </button>
            <button
              type="button"
              className={styles.editorToolBtn}
              onClick={() => imageInputRef.current?.click()}
              title={labels.imageTooltip}
              aria-label={labels.imageTooltip}
              disabled={isImageDisabled}
            >
              {isUploadingImage ? imageLabels?.uploading : labels.image}
            </button>
            <button
              type="button"
              className={styles.editorToolBtn}
              onClick={() => runCommand("insertHorizontalRule")}
              title={labels.divider}
              aria-label={labels.divider}
            >
              —
            </button>
            <button
              type="button"
              className={styles.editorToolBtn}
              onClick={() => {
                runCommand("removeFormat");
                applyBlockStyle("p");
              }}
              title={labels.clearFormat}
              aria-label={labels.clearFormat}
            >
              Tx
            </button>
          </span>
        </div>

        <div
          onMouseUp={() => {
            updateActiveFormats();
          }}
          onKeyUp={updateActiveFormats}
        >
          <VisualEditorCanvas
            ref={canvasRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            previewRenderer={previewRenderer}
            ariaLabel={ariaLabel}
            onFocus={onFocus}
            footerStatus={footerStatus}
          />
        </div>

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
    );
  },
);

export default DashboardNewsMarkdownEditor;
