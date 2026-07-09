import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "./page.module.css";

interface DeleteAccountSection {
  lang: string;
  title: string;
  lede: string;
  requestTitle: string;
  request: string;
  stepsTitle: string;
  stepsIntro: string;
  steps: string[];
  stepsNote: string;
  delayTitle: string;
  delay: string;
  deletedDataTitle: string;
  deletedData: string[];
  retainedTitle: string;
  retained: string;
  retentionTitle: string;
  retention: string;
  footer: string;
}

const deleteAccountSections: DeleteAccountSection[] = [
  {
    lang: "zh",
    title: "账号与数据删除",
    lede: "本页面适用于 ZHAO's Family 应用。",
    requestTitle: "删除你的账号",
    request:
      "现在可以直接在应用内删除账号，无需再发送邮件给支持团队来申请删除账号。",
    stepsTitle: "操作步骤",
    stepsIntro: "删除账号的步骤：",
    steps: [
      "登录你的 ZHAO's Family 账号；",
      "从 Dashboard 或移动端首页打开“个人资料”页面；",
      "选择“删除我的账号”；",
      "输入当前密码以确认操作。",
    ],
    stepsNote: "通过密码确认可以验证你确实是该账号的持有者。",
    delayTitle: "处理时间",
    delay:
      "确认后，你的账号将被停用，与个人资料相关的信息会被删除或匿名化。如法律、会计、安全或防止滥用等义务要求，部分数据可能会被临时保留。",
    deletedDataTitle: "被删除的数据",
    deletedData: [
      "用户账号；",
      "姓名和名字；",
      "电子邮箱地址；",
      "个人资料信息；",
      "与应用使用相关的数据；",
      "当不再需要保留时，与账号关联的数据。",
    ],
    retainedTitle: "可能被临时保留的数据",
    retained:
      "如果为遵守法律、会计、安全或防止滥用等义务所必需，部分数据可能会在有限的期限内继续保留。",
    retentionTitle: "额外的保留期限",
    retention:
      "因法律或行政原因保留的数据，可能会在适用义务所严格要求的期限内继续保留。该期限结束后，这些数据将被删除或匿名化。",
    footer: "最后更新：2026 年 7 月 9 日",
  },
  {
    lang: "en",
    title: "Account and Data Deletion",
    lede: "This page concerns the ZHAO's Family app.",
    requestTitle: "Delete your account",
    request:
      "Account deletion is now available directly in the app. You no longer need to email support to request that your account be deleted.",
    stepsTitle: "Steps to follow",
    stepsIntro: "To delete your account:",
    steps: [
      "sign in to your ZHAO's Family account;",
      "open the “Profile” page from the dashboard or the mobile home screen;",
      "select “Delete my account”;",
      "enter your current password to confirm the action.",
    ],
    stepsNote:
      "This password confirmation verifies that you are the holder of the account concerned.",
    delayTitle: "Processing time",
    delay:
      "Once confirmed, your account is deactivated and the personal information linked to the profile is deleted or anonymized. Some data may still be retained temporarily when required by a legal, accounting, security, or abuse-prevention obligation.",
    deletedDataTitle: "Deleted data",
    deletedData: [
      "user account;",
      "first and last name;",
      "email address;",
      "profile information;",
      "data related to use of the application;",
      "data associated with the account when its retention is no longer necessary.",
    ],
    retainedTitle: "Data that may be retained temporarily",
    retained:
      "Some data may be kept for a limited period if this is necessary to comply with legal, accounting, security, or abuse-prevention obligations.",
    retentionTitle: "Additional retention period",
    retention:
      "Data kept for legal or administrative reasons may be retained for the period strictly necessary under applicable obligations. After that period, it will be deleted or anonymized.",
    footer: "Last updated: July 9, 2026",
  },
  {
    lang: "fr",
    title: "Suppression de compte et des données",
    lede: "Cette page concerne l'application ZHAO Family.",
    requestTitle: "Supprimer votre compte",
    request:
      "La suppression de compte est désormais disponible directement dans l'application. Il n'est plus nécessaire d'envoyer une demande par e-mail au support pour supprimer votre compte.",
    stepsTitle: "Étapes à suivre",
    stepsIntro: "Pour supprimer votre compte :",
    steps: [
      "connectez-vous à votre compte ZHAO Family ;",
      "ouvrez la page « Profil » depuis le tableau de bord ou l'accueil mobile ;",
      "sélectionnez « Supprimer mon compte » ;",
      "saisissez votre mot de passe actuel pour confirmer l'action.",
    ],
    stepsNote:
      "Cette confirmation par mot de passe permet de vérifier que vous êtes bien le titulaire du compte concerné.",
    delayTitle: "Délai de traitement",
    delay:
      "Après confirmation, votre compte est désactivé et les informations personnelles liées au profil sont supprimées ou anonymisées. Certaines données peuvent toutefois être conservées temporairement lorsqu'une obligation légale, comptable, de sécurité ou de prévention des abus l'exige.",
    deletedDataTitle: "Données supprimées",
    deletedData: [
      "compte utilisateur ;",
      "nom et prénom ;",
      "adresse e-mail ;",
      "informations de profil ;",
      "données liées à l'utilisation de l'application ;",
      "données associées au compte lorsque leur conservation n'est plus nécessaire.",
    ],
    retainedTitle: "Données pouvant être conservées temporairement",
    retained:
      "Certaines données peuvent être conservées pendant une durée limitée si cela est nécessaire pour respecter des obligations légales, comptables, de sécurité ou de prévention des abus.",
    retentionTitle: "Durée de conservation supplémentaire",
    retention:
      "Les données conservées pour des raisons légales ou administratives peuvent être conservées jusqu'à la durée strictement nécessaire, selon les obligations applicables. Après cette période, elles seront supprimées ou anonymisées.",
    footer: "Dernière mise à jour : 9 juillet 2026",
  },
];

export const metadata: Metadata = {
  title: "Account Deletion / 账号删除 — ZHAO's Family",
  description:
    "Account and data deletion for the ZHAO's Family app in Chinese, English, and French.",
};

export default function DeleteAccountPage(): JSX.Element {
  return (
    <main className={styles.page}>
      <article className={styles.card} aria-labelledby="delete-account-title">
        <p className={styles.kicker}>ZHAO&apos;s Family</p>

        <header className={styles.header}>
          <h1 id="delete-account-title">Account Deletion / 账号删除</h1>
          <p>
            This page explains account and data deletion for the ZHAO&apos;s Family app in
            Chinese, English, and French. 本页面提供中文、英文和法文的账号删除说明。
          </p>
        </header>

        {deleteAccountSections.map((section) => (
          <section
            key={section.lang}
            className={styles.section}
            lang={section.lang}
            aria-labelledby={`delete-account-${section.lang}-title`}
          >
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id={`delete-account-${section.lang}-title`}>
                {section.title}
              </h2>
              <p>{section.lede}</p>

              <h3 className={styles.faqQuestion}>{section.requestTitle}</h3>
              <p>{section.request}</p>

              <h3 className={styles.faqQuestion}>{section.stepsTitle}</h3>
              <p>{section.stepsIntro}</p>
              <ul className={styles.list}>
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <p>{section.stepsNote}</p>

              <h3 className={styles.faqQuestion}>{section.delayTitle}</h3>
              <p>{section.delay}</p>

              <h3 className={styles.faqQuestion}>{section.deletedDataTitle}</h3>
              <ul className={styles.list}>
                {section.deletedData.map((dataItem) => (
                  <li key={dataItem}>{dataItem}</li>
                ))}
              </ul>

              <h3 className={styles.faqQuestion}>{section.retainedTitle}</h3>
              <p>{section.retained}</p>

              <h3 className={styles.faqQuestion}>{section.retentionTitle}</h3>
              <p>{section.retention}</p>

              <footer className={styles.footer}>{section.footer}</footer>
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
