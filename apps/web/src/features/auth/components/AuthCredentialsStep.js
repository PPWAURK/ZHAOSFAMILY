"use client";

import styles from "@/features/auth/auth-page.module.css";

export default function AuthCredentialsStep({
  isLogin,
  t,
  values,
  showPw,
  onTogglePassword,
  onChangeValue,
  onSubmit,
  onToggleMode,
  submitError,
  isSubmitting = false,
}) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {!isLogin ? (
        <>
          <div className={styles.field}>
            <div className={styles.fieldRow}>
              <div className={styles.fieldCol}>
                <label className={styles.fieldLabel} htmlFor="f-family-name">
                  {t.labelFamilyName}
                </label>
                <input
                  id="f-family-name"
                  className={styles.fieldInput}
                  type="text"
                  autoComplete="family-name"
                  placeholder={t.phFamilyName}
                  value={values.familyName}
                  onChange={(event) => onChangeValue("familyName", event.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldRow}>
              <div className={styles.fieldCol}>
                <label className={styles.fieldLabel} htmlFor="f-given-name">
                  {t.labelGivenName}
                </label>
                <input
                  id="f-given-name"
                  className={styles.fieldInput}
                  type="text"
                  autoComplete="given-name"
                  placeholder={t.phGivenName}
                  value={values.givenName}
                  onChange={(event) => onChangeValue("givenName", event.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <div className={styles.fieldCol}>
            <label className={styles.fieldLabel} htmlFor="f-email">
              {t.labelAccount}
            </label>
            <input
              id="f-email"
              className={styles.fieldInput}
              type="email"
              autoComplete="username"
              placeholder={t.phEmail}
              value={values.email}
              onChange={(event) => onChangeValue("email", event.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <div className={styles.fieldCol}>
            <label className={styles.fieldLabel} htmlFor="f-pw">
              {t.labelPassword}
            </label>
            <input
              id="f-pw"
              className={`${styles.fieldInput} ${!showPw ? styles.fieldInputMono : ""}`}
              type={showPw ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={t.phPassword}
              value={values.password}
              onChange={(event) => onChangeValue("password", event.target.value)}
              required
            />
          </div>
          <button
            type="button"
            className={styles.fieldAux}
            onClick={onTogglePassword}
          >
            {showPw ? t.hide : t.show}
          </button>
        </div>
      </div>

      <div className={styles.meta}>
        <label className={styles.check}>
          <input
            type="checkbox"
            className={styles.checkInput}
            checked={values.remember}
            onChange={(event) => onChangeValue("remember", event.target.checked)}
          />
          <span className={styles.checkBox} aria-hidden="true" />
          <span>{isLogin ? t.remember : t.agree}</span>
        </label>
        {isLogin ? (
          <a href="#" className={styles.forgot}>
            {t.forgot}
          </a>
        ) : null}
      </div>

      <div className={styles.cta}>
        <button type="submit" className={styles.ctaPrimary} disabled={isSubmitting}>
          <span>
            {isSubmitting
              ? isLogin
                ? "登入中"
                : t.ctaRegister
              : isLogin
                ? t.ctaLogin
                : t.ctaRegister}
          </span>
          <span className={styles.ctaArrow} aria-hidden="true">
            →
          </span>
        </button>
      </div>

      {submitError ? <p className={styles.formError}>{submitError}</p> : null}

      <div className={styles.switch}>
        <span className={styles.switchHint}>
          {isLogin ? t.newHere : t.alreadyFamily}
        </span>
        <button
          type="button"
          className={styles.switchLink}
          onClick={onToggleMode}
        >
          {isLogin ? t.join : t.switchBack}
        </button>
      </div>
    </form>
  );
}
