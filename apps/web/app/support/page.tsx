import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "../delete-account/page.module.css";

const supportChannels = [
  {
    label: "E-mail",
    value: "zhaogroupe12@gmail.com",
    href: "mailto:zhaogroupe12@gmail.com",
    description: "Pour toute demande technique, question sur votre compte ou signalement de problème.",
  },
];

const commonQuestions = [
  {
    question: "Comment réinitialiser mon mot de passe ?",
    answer:
      "Utilisez la fonctionnalité « Mot de passe oublié » sur la page de connexion. Un lien de réinitialisation sera envoyé à votre adresse e-mail.",
  },
  {
    question: "Comment modifier mes informations personnelles ?",
    answer:
      "Connectez-vous à l'application et accédez à la section « Profil » depuis le tableau de bord pour mettre à jour vos informations.",
  },
  {
    question: "Comment demander la suppression de mon compte ?",
    answer:
      "Consultez la page dédiée à la suppression de compte ou envoyez un e-mail au support en précisant votre demande.",
  },
  {
    question: "Qui peut voir mes données ?",
    answer:
      "Vos données sont accessibles uniquement dans le cadre des opérations internes de ZHAO's Family. Elles ne sont ni vendues ni partagées avec des tiers à des fins commerciales.",
  },
  {
    question: "Comment signaler un problème technique ?",
    answer:
      "Contactez le support par e-mail en décrivant le problème rencontré, les étapes pour le reproduire et, si possible, en joignant une capture d'écran.",
  },
];

export const metadata: Metadata = {
  title: "Support — ZHAO's Family",
  description:
    "Page de support de l'application interne ZHAO's Family. Contactez-nous et trouvez des réponses à vos questions.",
};

export default function SupportPage(): JSX.Element {
  return (
    <main className={styles.page} lang="fr">
      <article className={styles.card} aria-labelledby="support-title">
        <p className={styles.kicker}>ZHAO&apos;s Family</p>

        <header className={styles.header}>
          <h1 id="support-title">Support</h1>
          <p>
            Besoin d'aide ? Retrouvez ici les informations de contact et les réponses aux
            questions les plus fréquentes concernant l'application interne ZHAO's Family.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="contact-title">
          <h2 id="contact-title">Nous contacter</h2>
          {supportChannels.map((channel) => (
            <div key={channel.label}>
              <p>
                <strong>{channel.label}</strong> — {channel.description}
              </p>
              <a className={styles.mailButton} href={channel.href}>
                {channel.value}
              </a>
            </div>
          ))}
        </section>

        <section className={styles.section} aria-labelledby="faq-title">
          <h2 id="faq-title">Questions fréquentes</h2>
          {commonQuestions.map((item) => (
            <div key={item.question} style={{ marginTop: "20px" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  lineHeight: 1.4,
                }}
              >
                {item.question}
              </h3>
              <p style={{ margin: "8px 0 0" }}>{item.answer}</p>
            </div>
          ))}
        </section>

        <section className={styles.section} aria-labelledby="response-title">
          <h2 id="response-title">Délai de réponse</h2>
          <p>
            Notre équipe s'efforce de répondre à toutes les demandes dans un délai de{" "}
            <strong>48 heures ouvrées</strong>. Les demandes urgentes liées à la sécurité des
            comptes sont traitées en priorité.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="links-title">
          <h2 id="links-title">Pages utiles</h2>
          <ul className={styles.list}>
            <li>
              <a href="/privacy" style={{ color: "var(--accent)" }}>
                Politique de confidentialité
              </a>
            </li>
            <li>
              <a href="/delete-account" style={{ color: "var(--accent)" }}>
                Suppression de compte
              </a>
            </li>
          </ul>
        </section>

        <footer className={styles.footer}>Dernière mise à jour : 30 juin 2026</footer>
      </article>
    </main>
  );
}
