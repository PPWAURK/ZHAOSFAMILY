"use client";

import styles from "@/features/auth/auth-page.module.css";

function buildAvatarFallback(name) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    return "头像";
  }

  const segments = normalizedName.split(/\s+/).filter(Boolean);

  if (segments.length > 1) {
    return segments
      .slice(0, 2)
      .map((segment) => segment.charAt(0))
      .join("")
      .toUpperCase();
  }

  return normalizedName.replace(/\s+/g, "").slice(0, 2).toUpperCase();
}

function getTodayInputValue() {
  const today = new Date();
  const timezoneOffsetMs = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function openDatePicker(event) {
  event.currentTarget.showPicker?.();
}

export default function RegisterDetailsStep({
  t,
  selectedStore,
  extraDetails,
  memberName,
  isSubmitting,
  isSubmitSuccessful,
  submitError,
  onChangeExtraDetail,
  onToggleRole,
  onChangeAvatar,
  onBack,
  onSubmit,
  onReturnToLogin,
}) {
  const avatarFallback = buildAvatarFallback(memberName);
  const maxBirthday = getTodayInputValue();
  const panelTitle = isSubmitSuccessful
    ? t.detailsSuccessTitle
    : submitError
      ? t.detailsErrorTitle
      : t.detailsPendingTitle;
  const panelText = isSubmitSuccessful
    ? t.detailsSuccessText
    : submitError || t.detailsPendingText;
  const primaryLabel = isSubmitSuccessful
    ? t.detailsSuccessCta
    : isSubmitting
      ? t.detailsSubmittingCta
      : t.detailsSubmitCta;
  const isFormDisabled = isSubmitting || isSubmitSuccessful;

  return (
    <div className={styles.stepFlow}>
      <div className={styles.selectedStorePanel}>
        <div className={styles.selectedStoreTop}>
          <p className={styles.sectionEyebrow}>{t.selectedStoreLabel}</p>
          <span className={styles.selectedStoreCode}>{selectedStore.storeCode}</span>
        </div>
        <strong className={styles.selectedStoreName}>{selectedStore.name}</strong>
        <p className={styles.selectedStoreMeta}>{selectedStore.address}</p>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <div className={styles.fieldCol}>
            <label className={styles.fieldLabel} htmlFor="f-avatar">
              {t.labelAvatar}
            </label>
            <div className={styles.avatarComposer}>
              <div className={styles.avatarPreviewFrame} aria-hidden="true">
                {extraDetails.avatarPreviewUrl ? (
                  <img
                    src={extraDetails.avatarPreviewUrl}
                    alt=""
                    className={styles.avatarPreviewImage}
                  />
                ) : (
                  <span className={styles.avatarPreviewFallback}>{avatarFallback}</span>
                )}
              </div>

              <div className={styles.avatarActions}>
                <input
                  key={extraDetails.avatarPreviewUrl || "avatar-empty"}
                  id="f-avatar"
                  className={styles.fileInput}
                  type="file"
                  accept="image/*"
                  disabled={isFormDisabled}
                  onChange={(event) => onChangeAvatar(event.target.files?.[0] ?? null)}
                />
                <div className={styles.avatarActionRow}>
                  <label className={styles.fileTrigger} htmlFor="f-avatar" aria-disabled={isFormDisabled}>
                    {t.avatarUploadAction}
                  </label>
                  {extraDetails.avatarFile ? (
                    <button
                      type="button"
                      className={styles.fileGhostAction}
                      disabled={isFormDisabled}
                      onClick={() => onChangeAvatar(null)}
                    >
                      {t.avatarRemoveAction}
                    </button>
                  ) : null}
                </div>
                <p className={styles.fieldHint}>
                  {extraDetails.avatarFile?.name || t.avatarHint}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <div className={styles.fieldCol}>
            <label className={styles.fieldLabel} htmlFor="f-birthday">
              {t.labelBirthday}
            </label>
            <input
              id="f-birthday"
              className={styles.fieldInput}
              type="date"
              max={maxBirthday}
              value={extraDetails.birthday}
              disabled={isFormDisabled}
              onClick={openDatePicker}
              onFocus={openDatePicker}
              onChange={(event) => onChangeExtraDetail("birthday", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldCol}>
          <span className={styles.fieldLabel}>{t.labelJobRole}</span>
          <div
            className={styles.roleOptionGrid}
            role="radiogroup"
            aria-label={t.labelJobRole}
          >
            {t.roleOptions.map((roleOption) => {
              const isSelected = (extraDetails.roles || []).includes(roleOption.value);

              return (
                <button
                  key={roleOption.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isFormDisabled}
                  className={`${styles.roleOption} ${
                    isSelected ? styles.roleOptionSelected : ""
                  }`}
                  onClick={() => onToggleRole(roleOption.value)}
                >
                  <span className={styles.roleOptionLabel}>{roleOption.label}</span>
                  <span className={styles.roleOptionDescription}>
                    {roleOption.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.pendingPanel}>
        <p className={styles.pendingTitle}>{panelTitle}</p>
        <p className={styles.pendingText}>{panelText}</p>
      </div>

      <div className={styles.dualActionRow}>
        {!isSubmitSuccessful ? (
          <button
            type="button"
            className={styles.secondaryAction}
            disabled={isSubmitting}
            onClick={onBack}
          >
            {t.detailsBack}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.ctaPrimary}
          disabled={isSubmitting}
          onClick={isSubmitSuccessful ? onReturnToLogin : onSubmit}
        >
          <span>{primaryLabel}</span>
          <span className={styles.ctaArrow} aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </div>
  );
}
