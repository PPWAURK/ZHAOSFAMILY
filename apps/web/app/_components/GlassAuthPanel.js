"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import styles from "@/app/page.module.css";

const AUTH_MODES = [
  {
    id: "login",
    label: "登 入",
    eyebrow: "WELCOME BACK",
    title: "",
    description: "使用你的账号继续访问预订、权益与品牌资料。",
    primaryAction: "进 入",
    secondaryAction: "访客须知",
    secondaryLabel: "记住设备",
    fields: [
      {
        id: "login-email",
        label: "邮箱 / 账号",
        placeholder: "name@zhao-family.com",
        type: "email",
        autoComplete: "username",
      },
      {
        id: "login-password",
        label: "密码",
        placeholder: "请输入密码",
        type: "password",
        autoComplete: "current-password",
      },
    ],
    sideNote: "忘记密码",
  },
  {
    id: "register",
    label: "注 册",
    eyebrow: "NEW MEMBER",
    title: "创建一张新的入席凭证",
    description: "注册后即可管理邀请、查看活动动态并保存偏好设置。",
    primaryAction: "创 建",
    secondaryAction: "了解权益",
    secondaryLabel: "同意条款",
    fields: [
      {
        id: "register-name",
        label: "姓名",
        placeholder: "你的名字",
        type: "text",
        autoComplete: "name",
      },
      {
        id: "register-email",
        label: "邮箱",
        placeholder: "name@zhao-family.com",
        type: "email",
        autoComplete: "email",
      },
      {
        id: "register-password",
        label: "密码",
        placeholder: "至少 8 位",
        type: "password",
        autoComplete: "new-password",
      },
    ],
    sideNote: "继续即表示你接受《服务条款》与《隐私政策》。",
  },
];

const INITIAL_FORM_VALUES = {
  login: {
    "login-email": "",
    "login-password": "",
    "login-checkbox": false,
  },
  register: {
    "register-name": "",
    "register-email": "",
    "register-password": "",
    "register-checkbox": true,
  },
};

export default function GlassAuthPanel() {
  const [activeMode, setActiveMode] = useState("login");
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const activeIndex = activeMode === "login" ? 0 : 1;
  const activeModeConfig = AUTH_MODES[activeIndex];

  function updateField(modeId, fieldId, value) {
    setFormValues((current) => ({
      ...current,
      [modeId]: {
        ...current[modeId],
        [fieldId]: value,
      },
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <section className={styles.formSide}>
      <div className={styles.authShell}>
        <div className={styles.authCard}>
          <header className={styles.authHeader}>
            <div className={styles.authBrand}>
              <span className={styles.authBrandMark}>ZHAO</span>
              <span className={styles.authBrandSub}>Family Access</span>
            </div>

            <div className={styles.authTabs} role="tablist" aria-label="Auth mode">
              <motion.span
                className={styles.authTabIndicator}
                animate={{ x: activeIndex === 0 ? "0%" : "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                aria-hidden="true"
              />
              {AUTH_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={activeMode === mode.id}
                  className={`${styles.authTab} ${
                    activeMode === mode.id ? styles.authTabActive : ""
                  }`}
                  onClick={() => setActiveMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </header>

          <div className={styles.authBody}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeModeConfig.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={styles.authIntro}>
                  <span className={styles.authEyebrow}>{activeModeConfig.eyebrow}</span>
                  <h1 className={styles.authTitle}>{activeModeConfig.title}</h1>
                  <p className={styles.authDescription}>{activeModeConfig.description}</p>
                </div>

                <form className={styles.authForm} onSubmit={handleSubmit}>
                  {activeModeConfig.fields.map((field) => (
                    <label key={field.id} className={styles.authField}>
                      <span className={styles.authFieldLabel}>{field.label}</span>
                      <input
                        className={styles.authInput}
                        id={field.id}
                        type={field.type}
                        autoComplete={field.autoComplete}
                        placeholder={field.placeholder}
                        value={formValues[activeModeConfig.id][field.id]}
                        onChange={(event) =>
                          updateField(activeModeConfig.id, field.id, event.target.value)
                        }
                      />
                    </label>
                  ))}

                  <div className={styles.authMeta}>
                    <label className={styles.authCheck}>
                      <input
                        type="checkbox"
                        checked={
                          formValues[activeModeConfig.id][`${activeModeConfig.id}-checkbox`]
                        }
                        onChange={(event) =>
                          updateField(
                            activeModeConfig.id,
                            `${activeModeConfig.id}-checkbox`,
                            event.target.checked,
                          )
                        }
                      />
                      <span>{activeModeConfig.secondaryLabel}</span>
                    </label>
                    {activeMode === "login" ? (
                      <a href="#" className={styles.authForgot}>
                        忘记密码？
                      </a>
                    ) : null}
                  </div>

                  <button type="submit" className={styles.authSubmit}>
                    {activeModeConfig.primaryAction}
                  </button>

                  <button type="button" className={styles.authSecondary}>
                    {activeModeConfig.secondaryAction}
                  </button>

                  <p className={styles.authFootnote}>{activeModeConfig.sideNote}</p>
                </form>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
