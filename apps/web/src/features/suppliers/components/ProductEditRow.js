"use client";

import { useEffect, useRef, useState } from "react";

import { uploadProductImage } from "@/features/suppliers/services/suppliersApi";
import styles from "@/features/suppliers/suppliers-page.module.css";

const PRODUCT_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function toInputValue(product) {
  return {
    reference: product.reference || "",
    category: product.category || "",
    nameCn: product.nameCn || "",
    designationFr: product.designationFr || "",
    unit: product.unit || "",
    price: product.price === null || product.price === undefined ? "" : String(product.price),
    specification: product.specification || "",
    caseSize: product.caseSize === null || product.caseSize === undefined ? "" : String(product.caseSize),
    image: product.image || "",
  };
}

function getLocalizedUnit(unit, lang, fallback) {
  const normalizedUnit = unit?.trim();

  if (!normalizedUnit) {
    return fallback;
  }

  const unitLabels = normalizedUnit
    .split("/")
    .map((label) => label.trim())
    .filter(Boolean);

  if (unitLabels.length <= 1) {
    return normalizedUnit;
  }

  return lang === "zh" ? unitLabels[0] : unitLabels[unitLabels.length - 1];
}

export default function ProductEditRow({
  product,
  editing,
  submitting,
  lang,
  copy,
  onStartEdit,
  onCancelEdit,
  onSave,
  onToggleActive,
  onRequestDelete,
}) {
  const [draft, setDraft] = useState(() => toInputValue(product));
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  const isRowSubmitting = submitting || isUploadingImage;
  const hasProductImage = Boolean(product.image && !imageError);

  useEffect(() => {
    if (editing) {
      setDraft(toInputValue(product));
      setImageFile(null);
      setImagePreviewUrl("");
      setIsUploadingImage(false);
      setError("");

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }, [editing, product]);

  useEffect(() => {
    setImageError(false);
  }, [editing, draft.image, imagePreviewUrl, product.image]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function patch(key, value) {
    setError("");
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleImageFileChange(event) {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      return;
    }

    if (!PRODUCT_IMAGE_MIME_TYPES.has(nextFile.type)) {
      setError(copy.imageInvalidType);
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(nextFile);
    setImagePreviewUrl(URL.createObjectURL(nextFile));
    event.target.value = "";
  }

  function clearImage() {
    setImageFile(null);
    setImagePreviewUrl("");
    patch("image", "");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  async function save() {
    setError("");
    if (!draft.category.trim()) {
      setError(copy.validation.categoryRequired);
      return;
    }
    if (!draft.nameCn.trim()) {
      setError(copy.validation.nameCnRequired);
      return;
    }
    const priceValue = draft.price === "" ? 0 : Number(draft.price);
    if (!Number.isFinite(priceValue)) {
      setError(copy.validation.priceInvalid);
      return;
    }
    const caseSizeValue = draft.caseSize === "" ? null : Number(draft.caseSize);
    if (
      caseSizeValue !== null &&
      (!Number.isInteger(caseSizeValue) || caseSizeValue < 1)
    ) {
      setError(copy.validation.caseSizeInvalid);
      return;
    }

    let image = draft.image;

    if (imageFile) {
      try {
        setIsUploadingImage(true);
        image = await uploadProductImage(imageFile);
      } catch {
        setError(copy.imageUploadError);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    await onSave({ ...draft, image, price: priceValue, caseSize: caseSizeValue });
  }

  if (editing) {
    return (
      <tr className={styles.productEditRow}>
        <td colSpan={9} className={styles.productEditCell}>
          <div className={styles.productEditLayout}>
            <div className={styles.productEditFields}>
              <label className={styles.productEditField}>
                <span>{copy.colReference}</span>
                <input
                  className={`${styles.tableInput} ${styles.tableInputMono}`}
                  value={draft.reference}
                  onChange={(e) => patch("reference", e.target.value)}
                  placeholder={copy.referencePlaceholder}
                />
              </label>
              <label className={styles.productEditField}>
                <span>{copy.colCategory}</span>
                <input
                  className={styles.tableInput}
                  value={draft.category}
                  onChange={(e) => patch("category", e.target.value)}
                  placeholder={copy.categoryPlaceholder}
                />
              </label>
              <label className={styles.productEditField}>
                <span>{copy.colNameCn}</span>
                <input
                  className={styles.tableInput}
                  value={draft.nameCn}
                  onChange={(e) => patch("nameCn", e.target.value)}
                />
              </label>
              <label className={styles.productEditField}>
                <span>{copy.colDesignationFr}</span>
                <input
                  className={styles.tableInput}
                  value={draft.designationFr}
                  onChange={(e) => patch("designationFr", e.target.value)}
                />
              </label>
              <label className={styles.productEditField}>
                <span>{copy.colUnit}</span>
                <input
                  className={styles.tableInput}
                  value={draft.unit}
                  onChange={(e) => patch("unit", e.target.value)}
                  placeholder={copy.unitPlaceholder}
                />
              </label>
              <label className={styles.productEditField}>
                <span>{copy.colPrice}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${styles.tableInput} ${styles.tableInputMono}`}
                  value={draft.price}
                  onChange={(e) => patch("price", e.target.value)}
                  placeholder={copy.pricePlaceholder}
                />
              </label>
              <label className={styles.productEditField}>
                <span>{copy.colSpecification}</span>
                <input
                  className={styles.tableInput}
                  value={draft.specification}
                  onChange={(e) => patch("specification", e.target.value)}
                />
              </label>
              <label className={styles.productEditField}>
                <span>{copy.caseSizeLabel}</span>
                <span className={styles.caseSizeField}>
                  <span aria-hidden="true">📦</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    className={`${styles.tableInput} ${styles.tableInputMono} ${styles.caseSizeInput}`}
                    value={draft.caseSize}
                    onChange={(e) => patch("caseSize", e.target.value)}
                    placeholder={copy.caseSizePlaceholder}
                  />
                  <span>{draft.unit || copy.caseSizeUnitFallback}</span>
                </span>
              </label>
            </div>
            <div className={styles.productEditImageColumn}>
              <span className={styles.productEditFieldLabel}>{copy.colImage}</span>
              <div className={styles.productImageEditor}>
                <div className={styles.productImagePreview}>
                  {imagePreviewUrl || (draft.image && !imageError) ? (
                    <img
                      src={imagePreviewUrl || draft.image}
                      alt=""
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <span>{copy.imageEmpty}</span>
                  )}
                </div>
                <div className={styles.productImageActions}>
                  <label className={styles.productImageUploadButton}>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFileChange}
                      disabled={isRowSubmitting}
                    />
                    {imageFile ? copy.imageChange : copy.imageUpload}
                  </label>
                  {imageFile || draft.image ? (
                    <button
                      type="button"
                      className={styles.productImageClearButton}
                      onClick={clearImage}
                      disabled={isRowSubmitting}
                    >
                      {copy.imageClear}
                    </button>
                  ) : null}
                </div>
                <small className={styles.productImageHint}>
                  {imageFile ? imageFile.name : copy.imagePlaceholder}
                </small>
              </div>
            </div>
          </div>
          <div className={styles.productEditFooter}>
            {error ? <div className={styles.formError}>{error}</div> : <span />}
            <div className={styles.rowActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                onClick={save}
                disabled={isRowSubmitting}
              >
                {isRowSubmitting ? copy.saving : copy.save}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                onClick={onCancelEdit}
                disabled={isRowSubmitting}
              >
                {copy.cancel}
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr style={product.isActive === false ? { opacity: 0.55 } : undefined}>
      <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{product.reference || "—"}</td>
      <td>{product.category || "—"}</td>
      <td>
        <div className={styles.nameCell}>
          {hasProductImage ? (
            <img
              src={product.image}
              alt=""
              className={styles.nameImage}
              onError={() => setImageError(true)}
            />
          ) : null}
          <span>{product.nameCn || "—"}</span>
          {product.isActive === false ? (
            <span className={styles.inactiveBadge}>{copy.inactiveBadge}</span>
          ) : null}
        </div>
      </td>
      <td>{product.designationFr || "—"}</td>
      <td>{getLocalizedUnit(product.unit, lang, "—")}</td>
      <td
        style={{
          fontFamily: "var(--mono)",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {copy.currencySymbol}
        {Number(product.price || 0).toFixed(2)}
      </td>
      <td>
        <div className={styles.specificationCell}>
          <span>{product.specification || "—"}</span>
          {product.caseSize ? (
            <span className={styles.caseSizeSummary}>
              📦 {copy.caseSizeLabel} {product.caseSize}{" "}
              {getLocalizedUnit(product.unit, lang, copy.caseSizeUnitFallback)}
            </span>
          ) : null}
        </div>
      </td>
      <td>
        <span className={styles.productImageStatus}>
          {hasProductImage ? copy.imagePresent : copy.imageEmpty}
        </span>
      </td>
      <td>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
            onClick={onStartEdit}
          >
            {copy.edit}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
            onClick={onToggleActive}
          >
            {product.isActive === false ? copy.activate : copy.deactivate}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
            onClick={onRequestDelete}
          >
            {copy.deleteBtn}
          </button>
        </div>
      </td>
    </tr>
  );
}
