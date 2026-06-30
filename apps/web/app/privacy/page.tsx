import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "../delete-account/page.module.css";

const collectedData = [
  "nom et prénom ;",
  "adresse e-mail ;",
  "numéro de téléphone ;",
  "identifiants de connexion (nom d'utilisateur et mot de passe chiffré) ;",
  "données d'utilisation : pages consultées, actions effectuées, horaires de connexion, modules utilisés ;",
  "contenu utilisateur : messages, commentaires, publications et tout contenu généré au sein de l'application ;",
  "photos ou vidéos importées ou capturées via l'application (photo de profil, pièces jointes, documents) ;",
  "informations liées au restaurant : établissement de rattachement, rôle, poste occupé et niveau hiérarchique.",
];

const dataPurposes = [
  "authentifier les employés et sécuriser l'accès à l'application ;",
  "gérer les profils, les restaurants, les commandes et les workflows internes ;",
  "assurer le suivi de la formation, du recrutement et de la progression du personnel ;",
  "permettre la communication interne et le partage d'informations entre équipes ;",
  "envoyer des notifications opérationnelles liées au travail ;",
  "garantir la sécurité, la prévention des abus et la continuité de service.",
];

const userRights = [
  "accéder à leurs données personnelles ;",
  "demander la rectification de données inexactes ou incomplètes ;",
  "demander la suppression de leur compte et des données associées ;",
  "s'opposer au traitement de leurs données pour un motif légitime ;",
  "contacter le support pour toute question liée à la confidentialité.",
];

export const metadata: Metadata = {
  title: "Politique de confidentialité — ZHAO's Family",
  description:
    "Politique de confidentialité de l'application interne ZHAO's Family. Informations sur la collecte, le traitement et la protection des données personnelles.",
};

export default function PrivacyPage(): JSX.Element {
  return (
    <main className={styles.page} lang="fr">
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Navigation pages publiques">
          <a href="/" className={styles.navBrand}>
            ZHAO&apos;s Family
          </a>
          <div className={styles.navLinks}>
            <a
              href="/privacy"
              className={`${styles.navLink} ${styles.navLinkActive}`}
              aria-current="page"
            >
              Politique de confidentialité
            </a>
            <a href="/support" className={styles.navLink}>
              Support
            </a>
            <a href="/delete-account" className={styles.navLink}>
              Suppression de compte
            </a>
          </div>
        </nav>

        <article className={styles.card} aria-labelledby="privacy-title">
          <div className={styles.headerBlock}>
            <p className={styles.kicker}>ZHAO&apos;s Family</p>

            <header className={styles.header}>
              <h1 id="privacy-title">Politique de confidentialité</h1>
              <p className={styles.lede}>
                Cette politique décrit la manière dont l&apos;application interne ZHAO&apos;s Family
                collecte, utilise et protège les données personnelles de ses utilisateurs. Elle
                s&apos;applique à l&apos;ensemble des employés et responsables utilisant la plateforme.
              </p>
            </header>
          </div>

          <section className={styles.section} aria-labelledby="controller-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="controller-title">
                Responsable du traitement
              </h2>
              <p>
                Le responsable du traitement des données est ZHAO&apos;s Family. Pour toute demande
                relative à la protection de vos données personnelles, vous pouvez contacter le
                support à l&apos;adresse suivante :
              </p>
              <a className={styles.mailButton} href="mailto:zhaogroupe12@gmail.com">
                zhaogroupe12@gmail.com
              </a>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="data-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="data-title">
                Données collectées
              </h2>
              <p>
                Dans le cadre de l&apos;utilisation de l&apos;application, les données suivantes peuvent
                être collectées et traitées :
              </p>
              <ul className={styles.list}>
                {collectedData.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="purpose-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="purpose-title">
                Finalités du traitement
              </h2>
              <p>Les données collectées sont utilisées pour les finalités suivantes :</p>
              <ul className={styles.list}>
                {dataPurposes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="sharing-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="sharing-title">
                Partage et sécurité des données
              </h2>
              <p>
                Les données personnelles sont strictement réservées à l&apos;usage interne de
                ZHAO&apos;s Family et ne sont ni vendues, ni louées, ni partagées avec des tiers à
                des fins commerciales.
              </p>
              <p>
                Des prestataires techniques de confiance peuvent être amenés à traiter certaines
                données uniquement dans le cadre de l&apos;hébergement, de l&apos;envoi de
                notifications, du support technique ou de la sécurité du service. Ces prestataires
                sont soumis à des obligations de confidentialité.
              </p>
              <p>
                Toutes les communications entre votre appareil et nos serveurs sont protégées par
                des connexions chiffrées. Les mots de passe sont stockés de manière sécurisée et
                ne sont jamais conservés en clair.
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="rights-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="rights-title">
                Vos droits
              </h2>
              <p>
                Conformément à la réglementation en vigueur, vous disposez des droits suivants :
              </p>
              <ul className={styles.list}>
                {userRights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                Pour exercer vos droits ou pour toute question relative à cette politique,
                contactez notre support :
              </p>
              <a className={styles.mailButton} href="mailto:zhaogroupe12@gmail.com">
                zhaogroupe12@gmail.com
              </a>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="deletion-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="deletion-title">
                Suppression de compte
              </h2>
              <p>
                Vous pouvez à tout moment demander la suppression de votre compte et des données
                qui y sont associées. Les demandes de suppression sont traitées dans un délai
                maximum de 30 jours. Pour en savoir plus, consultez la page dédiée :
              </p>
              <a className={styles.mailButton} href="/delete-account">
                Page de suppression de compte
              </a>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="retention-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="retention-title">
                Durée de conservation
              </h2>
              <p>
                Les données personnelles sont conservées pendant la durée strictement nécessaire
                aux finalités pour lesquelles elles ont été collectées. Lorsqu&apos;elles ne sont
                plus nécessaires, elles sont supprimées ou anonymisées.
              </p>
              <p>
                Certaines données peuvent toutefois être conservées plus longtemps si la loi
                l&apos;exige, notamment pour des raisons comptables, fiscales, de sécurité ou de
                prévention des abus.
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="updates-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="updates-title">
                Modifications de cette politique
              </h2>
              <p>
                ZHAO&apos;s Family se réserve le droit de mettre à jour cette politique de
                confidentialité à tout moment. Toute modification sera publiée sur cette page avec
                une date de mise à jour actualisée. Nous vous invitons à consulter régulièrement
                cette page pour rester informé des éventuels changements.
              </p>
            </div>
          </section>

          <footer className={styles.footer}>Dernière mise à jour : 30 juin 2026</footer>
        </article>
      </div>
    </main>
  );
}
