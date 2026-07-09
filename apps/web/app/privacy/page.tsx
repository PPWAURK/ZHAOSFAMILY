import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "../delete-account/page.module.css";

const SUPPORT_EMAIL = "zhaogroupe12@gmail.com";

const privacySections = [
  {
    lang: "zh",
    title: "隐私政策",
    intro:
      "本政策说明 ZHAO's Family 内部应用如何收集、使用和保护用户个人数据。适用于使用平台的员工、门店负责人和总部管理人员。",
    controllerTitle: "数据负责人",
    controller:
      "数据处理负责人为 ZHAO's Family。如需咨询个人数据、隐私或账号相关问题，请联系支持邮箱：",
    dataTitle: "收集的数据",
    collectedData: [
      "姓名、邮箱、手机号、账号状态等身份信息；",
      "登录凭据相关信息，包括用户名和加密后的密码；",
      "使用数据，例如访问页面、操作记录、登录时间和使用模块；",
      "用户在应用内创建的内容，例如消息、评论、发布内容和附件；",
      "上传或拍摄的图片、视频或文件，例如头像、培训资料、订单附件；",
      "与门店相关的信息，例如所属门店、岗位、角色和管理范围。",
    ],
    purposeTitle: "使用目的",
    dataPurposes: [
      "认证员工身份并保护应用访问安全；",
      "管理用户资料、门店、订单、培训、招聘和内部流程；",
      "支持内部沟通、公告发布和跨门店协作；",
      "发送与工作相关的运营通知；",
      "保障服务安全、预防滥用并维持系统连续性。",
    ],
    sharingTitle: "数据共享与安全",
    sharingParagraphs: [
      "个人数据仅用于 ZHAO's Family 内部运营，不会出售、出租或用于商业广告共享。",
      "可信技术服务商可能在托管、通知发送、技术支持或安全维护范围内处理部分数据，并受保密义务约束。",
      "设备与服务器之间的通信使用加密连接。密码以安全方式保存，不会以明文存储。",
    ],
    rightsTitle: "用户权利",
    rightsIntro: "根据适用法规，用户可以：",
    userRights: [
      "访问自己的个人数据；",
      "要求更正不准确或不完整的数据；",
      "在应用的“个人资料”页面自助删除账号；",
      "在有合法理由时反对部分数据处理；",
      "就隐私或数据问题联系支持团队。",
    ],
    deletionTitle: "账号删除",
    deletion:
      "你可以登录后进入“个人资料”，选择“删除我的账号”，并输入当前密码确认。确认后账号会被停用，个人资料相关信息会被删除或匿名化。更多说明请查看账号删除说明页。",
    deletionLink: "账号删除说明",
    retentionTitle: "数据保留",
    retentionParagraphs: [
      "个人数据只会在实现收集目的所需期间保留。当不再需要时，数据会被删除或匿名化。",
      "如法律、会计、安全或防止滥用等原因要求，部分数据可能在必要期限内继续保留。",
    ],
    updateTitle: "政策更新",
    update:
      "ZHAO's Family 可根据产品、法律或运营要求更新本隐私政策。更新后会在本页面标注新的日期。",
    footer: "最后更新：2026 年 7 月 9 日",
  },
  {
    lang: "en",
    title: "Privacy Policy",
    intro:
      "This policy explains how the ZHAO's Family internal app collects, uses, and protects personal data. It applies to employees, store managers, and headquarters users of the platform.",
    controllerTitle: "Data Controller",
    controller:
      "The data controller is ZHAO's Family. For questions about personal data, privacy, or accounts, contact support at:",
    dataTitle: "Data We Collect",
    collectedData: [
      "identity information such as name, email, phone number, and account status;",
      "login credential information, including username and encrypted password;",
      "usage data such as visited pages, actions performed, login times, and modules used;",
      "user-generated content such as messages, comments, posts, and attachments;",
      "uploaded or captured photos, videos, and files such as profile photos, training files, and order attachments;",
      "store-related information such as assigned store, role, position, and management scope.",
    ],
    purposeTitle: "Purposes",
    dataPurposes: [
      "authenticate employees and secure access to the application;",
      "manage profiles, stores, orders, training, recruitment, and internal workflows;",
      "support internal communication, announcements, and cross-store collaboration;",
      "send operational notifications related to work;",
      "protect service security, prevent abuse, and maintain continuity.",
    ],
    sharingTitle: "Sharing and Security",
    sharingParagraphs: [
      "Personal data is used only for ZHAO's Family internal operations. It is not sold, rented, or shared for advertising.",
      "Trusted technical providers may process limited data for hosting, notifications, technical support, or service security, under confidentiality obligations.",
      "Communication between your device and our servers uses encrypted connections. Passwords are stored securely and never kept in plain text.",
    ],
    rightsTitle: "Your Rights",
    rightsIntro: "Under applicable regulations, users may:",
    userRights: [
      "access their personal data;",
      "request correction of inaccurate or incomplete data;",
      "delete their account from the Profile page in the application;",
      "object to certain processing when they have a legitimate reason;",
      "contact support for privacy or data questions.",
    ],
    deletionTitle: "Account Deletion",
    deletion:
      "After signing in, open Profile, choose “Delete my account”, and confirm with your current password. Once confirmed, the account is deactivated and profile-related personal information is deleted or anonymized. See the account deletion information page for details.",
    deletionLink: "Account deletion information",
    retentionTitle: "Retention",
    retentionParagraphs: [
      "Personal data is kept only for as long as necessary for the purposes for which it was collected. When it is no longer needed, it is deleted or anonymized.",
      "Some data may be retained for the necessary period when required for legal, accounting, security, or abuse-prevention reasons.",
    ],
    updateTitle: "Policy Updates",
    update:
      "ZHAO's Family may update this privacy policy to reflect product, legal, or operational changes. Updates will be published on this page with a new date.",
    footer: "Last updated: July 9, 2026",
  },
  {
    lang: "fr",
    title: "Politique de confidentialité",
    intro:
      "Cette politique décrit la manière dont l'application interne ZHAO's Family collecte, utilise et protège les données personnelles. Elle s'applique aux employés, responsables de boutique et utilisateurs du siège.",
    controllerTitle: "Responsable du traitement",
    controller:
      "Le responsable du traitement des données est ZHAO's Family. Pour toute question relative aux données personnelles, à la confidentialité ou au compte, contactez le support :",
    dataTitle: "Données collectées",
    collectedData: [
      "nom, prénom, adresse e-mail, numéro de téléphone et statut du compte ;",
      "informations liées aux identifiants de connexion, dont le nom d'utilisateur et le mot de passe chiffré ;",
      "données d'utilisation : pages consultées, actions effectuées, horaires de connexion et modules utilisés ;",
      "contenu utilisateur : messages, commentaires, publications et pièces jointes ;",
      "photos, vidéos et fichiers importés ou capturés, comme la photo de profil, les supports de formation ou les pièces jointes de commande ;",
      "informations liées au restaurant : établissement de rattachement, rôle, poste occupé et périmètre de gestion.",
    ],
    purposeTitle: "Finalités du traitement",
    dataPurposes: [
      "authentifier les employés et sécuriser l'accès à l'application ;",
      "gérer les profils, les restaurants, les commandes, la formation, le recrutement et les workflows internes ;",
      "permettre la communication interne, les annonces et la collaboration entre restaurants ;",
      "envoyer des notifications opérationnelles liées au travail ;",
      "garantir la sécurité du service, prévenir les abus et assurer la continuité.",
    ],
    sharingTitle: "Partage et sécurité des données",
    sharingParagraphs: [
      "Les données personnelles sont réservées à l'usage interne de ZHAO's Family. Elles ne sont ni vendues, ni louées, ni partagées à des fins publicitaires.",
      "Des prestataires techniques de confiance peuvent traiter certaines données uniquement pour l'hébergement, l'envoi de notifications, le support technique ou la sécurité du service, sous obligation de confidentialité.",
      "Les communications entre votre appareil et nos serveurs utilisent des connexions chiffrées. Les mots de passe sont stockés de manière sécurisée et ne sont jamais conservés en clair.",
    ],
    rightsTitle: "Vos droits",
    rightsIntro: "Conformément à la réglementation applicable, vous pouvez :",
    userRights: [
      "accéder à vos données personnelles ;",
      "demander la rectification de données inexactes ou incomplètes ;",
      "supprimer votre compte depuis la page « Profil » de l'application ;",
      "vous opposer à certains traitements pour un motif légitime ;",
      "contacter le support pour toute question liée à la confidentialité ou aux données.",
    ],
    deletionTitle: "Suppression de compte",
    deletion:
      "Après connexion, ouvrez « Profil », choisissez « Supprimer mon compte » puis confirmez avec votre mot de passe actuel. Après confirmation, le compte est désactivé et les informations personnelles liées au profil sont supprimées ou anonymisées. La page dédiée explique ce parcours.",
    deletionLink: "Informations sur la suppression de compte",
    retentionTitle: "Durée de conservation",
    retentionParagraphs: [
      "Les données personnelles sont conservées uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées. Lorsqu'elles ne sont plus nécessaires, elles sont supprimées ou anonymisées.",
      "Certaines données peuvent être conservées pendant la durée nécessaire si cela est requis pour des raisons légales, comptables, de sécurité ou de prévention des abus.",
    ],
    updateTitle: "Modifications de cette politique",
    update:
      "ZHAO's Family peut mettre à jour cette politique pour refléter les évolutions du produit, de la loi ou des opérations. Les mises à jour seront publiées sur cette page avec une nouvelle date.",
    footer: "Dernière mise à jour : 9 juillet 2026",
  },
];

export const metadata: Metadata = {
  title: "Privacy Policy / 隐私政策 — ZHAO's Family",
  description:
    "Privacy policy for the ZHAO's Family internal app in Chinese, English, and French.",
};

export default function PrivacyPage(): JSX.Element {
  return (
    <main className={styles.page}>
      <article className={styles.card} aria-labelledby="privacy-title">
        <p className={styles.kicker}>ZHAO&apos;s Family</p>

        <header className={styles.header}>
          <h1 id="privacy-title">Privacy Policy / 隐私政策</h1>
          <p>
            This page provides the privacy policy for the ZHAO&apos;s Family internal app in
            Chinese, English, and French. 本页面提供中文、英文和法文隐私政策说明。
          </p>
        </header>

        {privacySections.map((section) => (
          <section
            key={section.lang}
            className={styles.section}
            lang={section.lang}
            aria-labelledby={`privacy-${section.lang}-title`}
          >
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id={`privacy-${section.lang}-title`}>
                {section.title}
              </h2>
              <p>{section.intro}</p>

              <h3 className={styles.faqQuestion}>{section.controllerTitle}</h3>
              <p>
                {section.controller}{" "}
                <a className={styles.inlineLink} href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </p>

              <h3 className={styles.faqQuestion}>{section.dataTitle}</h3>
              <ul className={styles.list}>
                {section.collectedData.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3 className={styles.faqQuestion}>{section.purposeTitle}</h3>
              <ul className={styles.list}>
                {section.dataPurposes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3 className={styles.faqQuestion}>{section.sharingTitle}</h3>
              {section.sharingParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <h3 className={styles.faqQuestion}>{section.rightsTitle}</h3>
              <p>{section.rightsIntro}</p>
              <ul className={styles.list}>
                {section.userRights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3 className={styles.faqQuestion}>{section.deletionTitle}</h3>
              <p>{section.deletion}</p>
              <a className={styles.mailButton} href="/delete-account">
                {section.deletionLink}
              </a>

              <h3 className={styles.faqQuestion}>{section.retentionTitle}</h3>
              {section.retentionParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <h3 className={styles.faqQuestion}>{section.updateTitle}</h3>
              <p>{section.update}</p>

              <footer className={styles.footer}>{section.footer}</footer>
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
