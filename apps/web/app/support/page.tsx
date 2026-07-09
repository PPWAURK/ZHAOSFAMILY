import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "../delete-account/page.module.css";

const SUPPORT_EMAIL = "zhaogroupe12@gmail.com";

const supportSections = [
  {
    lang: "zh",
    title: "中文支持",
    intro:
      "如果你在使用 ZHAO's Family 内部应用时遇到账号、登录、功能或技术问题，可以先查看下面的常见问题。",
    contactTitle: "联系我们",
    contactDescription:
      "用于技术问题、账号异常或功能故障反馈。请尽量写清楚问题、发生页面、操作步骤和截图。",
    faqTitle: "常见问题",
    responseTitle: "回复时间",
    response:
      "我们会尽量在 48 个工作小时内回复。账号安全、无法登录和影响门店运营的问题会优先处理。",
    linksTitle: "相关页面",
    privacyLabel: "隐私政策",
    deleteLabel: "账号删除说明",
    footer: "最后更新：2026 年 7 月 9 日",
    questions: [
      {
        question: "如何重置密码？",
        answer:
          "在登录页点击“忘记密码”，输入账号邮箱后，系统会发送密码重置链接。",
      },
      {
        question: "如何修改个人资料？",
        answer:
          "登录后进入 Dashboard 或移动端首页，打开“个人资料”页面即可修改支持自助更新的资料。",
      },
      {
        question: "如何删除我的账号？",
        answer:
          "现在不需要发邮件申请删除。请登录后进入“个人资料”，选择“删除我的账号”，并输入当前密码确认。",
      },
      {
        question: "谁可以看到我的数据？",
        answer:
          "数据只用于 ZHAO's Family 内部运营、账号管理、培训、订单和门店协作，不会出售或用于商业广告共享。",
      },
      {
        question: "如何反馈技术问题？",
        answer:
          "请通过支持邮箱说明问题、复现步骤、设备或浏览器信息，并尽量附上截图。",
      },
    ],
  },
  {
    lang: "en",
    title: "English Support",
    intro:
      "If you need help with your ZHAO's Family internal app account, login, features, or technical issues, start with the answers below.",
    contactTitle: "Contact Us",
    contactDescription:
      "Use this address for technical issues, account problems, or feature bugs. Please include the page, steps to reproduce, and screenshots when possible.",
    faqTitle: "Frequently Asked Questions",
    responseTitle: "Response Time",
    response:
      "We aim to reply within 48 business hours. Account security, login blockers, and store-operation issues are prioritized.",
    linksTitle: "Useful Pages",
    privacyLabel: "Privacy Policy",
    deleteLabel: "Account Deletion Information",
    footer: "Last updated: July 9, 2026",
    questions: [
      {
        question: "How do I reset my password?",
        answer:
          "Use “Forgot password” on the login page. A reset link will be sent to your account email address.",
      },
      {
        question: "How do I update my personal information?",
        answer:
          "After signing in, open Profile from the dashboard or mobile home screen and update the fields that are available for self-service.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "You no longer need to email support for account deletion. Sign in, open Profile, choose “Delete my account”, and confirm with your current password.",
      },
      {
        question: "Who can see my data?",
        answer:
          "Your data is used only for ZHAO's Family internal operations, account management, training, orders, and store collaboration. It is not sold or shared for advertising.",
      },
      {
        question: "How do I report a technical issue?",
        answer:
          "Email support with the issue, reproduction steps, device or browser information, and screenshots when possible.",
      },
    ],
  },
  {
    lang: "fr",
    title: "Support en français",
    intro:
      "Besoin d'aide avec votre compte, la connexion, une fonctionnalité ou un problème technique de l'application interne ZHAO's Family ? Consultez d'abord les réponses ci-dessous.",
    contactTitle: "Nous contacter",
    contactDescription:
      "Pour toute demande technique, question sur votre compte ou signalement de problème. Indiquez la page concernée, les étapes de reproduction et une capture d'écran si possible.",
    faqTitle: "Questions fréquentes",
    responseTitle: "Délai de réponse",
    response:
      "Notre équipe s'efforce de répondre dans un délai de 48 heures ouvrées. Les demandes liées à la sécurité du compte, à l'accès ou aux opérations en restaurant sont traitées en priorité.",
    linksTitle: "Pages utiles",
    privacyLabel: "Politique de confidentialité",
    deleteLabel: "Informations sur la suppression de compte",
    footer: "Dernière mise à jour : 9 juillet 2026",
    questions: [
      {
        question: "Comment réinitialiser mon mot de passe ?",
        answer:
          "Utilisez la fonctionnalité « Mot de passe oublié » sur la page de connexion. Un lien de réinitialisation sera envoyé à votre adresse e-mail.",
      },
      {
        question: "Comment modifier mes informations personnelles ?",
        answer:
          "Connectez-vous à l'application et ouvrez la section « Profil » depuis le tableau de bord ou l'accueil mobile pour mettre à jour les informations disponibles en libre-service.",
      },
      {
        question: "Comment supprimer mon compte ?",
        answer:
          "Il n'est plus nécessaire d'envoyer un e-mail au support. Connectez-vous, ouvrez « Profil », choisissez « Supprimer mon compte » puis confirmez avec votre mot de passe actuel.",
      },
      {
        question: "Qui peut voir mes données ?",
        answer:
          "Vos données sont utilisées uniquement pour les opérations internes de ZHAO's Family, la gestion des comptes, la formation, les commandes et la collaboration entre restaurants. Elles ne sont pas vendues ni partagées à des fins publicitaires.",
      },
      {
        question: "Comment signaler un problème technique ?",
        answer:
          "Contactez le support par e-mail en décrivant le problème rencontré, les étapes pour le reproduire, l'appareil ou le navigateur utilisé et, si possible, une capture d'écran.",
      },
    ],
  },
];

export const metadata: Metadata = {
  title: "Support / 支持 — ZHAO's Family",
  description:
    "Support page for the ZHAO's Family internal app in Chinese, English, and French.",
};

export default function SupportPage(): JSX.Element {
  return (
    <main className={styles.page}>
      <article className={styles.card} aria-labelledby="support-title">
        <p className={styles.kicker}>ZHAO&apos;s Family</p>

        <header className={styles.header}>
          <h1 id="support-title">Support / 支持</h1>
          <p>
            Find help for the ZHAO&apos;s Family internal app in Chinese, English, and French.
            这里提供中文、英文和法文支持说明。
          </p>
        </header>

        {supportSections.map((section) => (
          <section
            key={section.lang}
            className={styles.section}
            lang={section.lang}
            aria-labelledby={`support-${section.lang}-title`}
          >
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id={`support-${section.lang}-title`}>
                {section.title}
              </h2>
              <p>{section.intro}</p>

              <div className={styles.contactItem}>
                <p className={styles.contactLabel}>{section.contactTitle}</p>
                <p className={styles.contactDescription}>{section.contactDescription}</p>
                <a className={styles.mailButton} href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </div>

              <div className={styles.faqList} aria-label={section.faqTitle}>
                {section.questions.map((item) => (
                  <div key={item.question} className={styles.faqItem}>
                    <h3 className={styles.faqQuestion}>{item.question}</h3>
                    <p className={styles.faqAnswer}>{item.answer}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className={styles.faqQuestion}>{section.responseTitle}</h3>
                <p className={styles.faqAnswer}>{section.response}</p>
              </div>

              <div>
                <h3 className={styles.faqQuestion}>{section.linksTitle}</h3>
                <ul className={styles.list}>
                  <li>
                    <a href="/privacy" className={styles.inlineLink}>
                      {section.privacyLabel}
                    </a>
                  </li>
                  <li>
                    <a href="/delete-account" className={styles.inlineLink}>
                      {section.deleteLabel}
                    </a>
                  </li>
                </ul>
              </div>

              <footer className={styles.footer}>{section.footer}</footer>
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
