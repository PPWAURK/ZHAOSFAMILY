"use client";

import { useEffect, useRef, useState } from "react";

import { uploadProductImage } from "@/features/suppliers/services/suppliersApi";
import styles from "@/features/suppliers/suppliers-page.module.css";

function toInputValue(product) {
  return {
    reference: product.reference || "",
    category: product.category || "",
    nameCn: product.nameCn || "",
    designationFr: product.designationFr || "",
    unit: product.unit || "",
    price: product.price === null || product.price === undefined ? "" : String(product.price),
    specification: product.specification || "",
    image: product.image || "",
  };
}

export default function ProductEditRow({
  product,
  editing,
  submitting,
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

    if (!nextFile.type.startsWith("image/")) {
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

    await onSave({ ...draft, image, price: priceValue });
  }

  if (editing) {
    return (
      <tr>
        <td>
          <input
            className={`${styles.tableInput} ${styles.tableInputMono}`}
            value={draft.reference}
            onChange={(e) => patch("reference", e.target.value)}
            placeholder={copy.referencePlaceholder}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.category}
            onChange={(e) => patch("category", e.target.value)}
            placeholder={copy.categoryPlaceholder}
          />
        </td>
        <td>
          <div className={styles.nameCell}>
            {draft.image && !imageError ? (
              <img
                src={draft.image}
                alt=""
                className={styles.nameImage}
                onError={() => setImageError(true)}
              />
            ) : null}
            <input
              className={styles.tableInput}
              value={draft.nameCn}
              onChange={(e) => patch("nameCn", e.target.value)}
            />
          </div>
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.designationFr}
            onChange={(e) => patch("designationFr", e.target.value)}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.unit}
            onChange={(e) => patch("unit", e.target.value)}
            placeholder={copy.unitPlaceholder}
          />
        </td>
        <td>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`${styles.tableInput} ${styles.tableInputMono} ${styles.tableInputNarrow}`}
            value={draft.price}
            onChange={(e) => patch("price", e.target.value)}
            placeholder={copy.pricePlaceholder}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.specification}
            onChange={(e) => patch("specification", e.target.value)}
          />
        </td>
        <td>
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
                  accept="image/*"
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
        </td>
        <td>
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
          {error ? (
            <div className={styles.formError} style={{ marginTop: 6 }}>
              {error}
            </div>
          ) : null}
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
      <td>{product.unit || "—"}</td>
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
      <td>{product.specification || "—"}</td>
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
