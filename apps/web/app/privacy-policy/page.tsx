import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "../delete-account/page.module.css";

const collectedData = [
  "identité professionnelle : nom, prénom, adresse e-mail, boutique, poste et statut de compte ;",
  "coordonnées renseignées par l'utilisateur : téléphone et adresse ;",
  "photo de profil si l'utilisateur choisit d'en ajouter une ;",
  "données d'utilisation nécessaires aux modules internes : commandes, formation, progression, recrutement et gestion de boutique ;",
  "jeton de notification push, uniquement si l'utilisateur autorise les notifications.",
];

const dataPurposes = [
  "authentifier les employés et sécuriser l'accès à l'application ;",
  "gérer les profils, les boutiques, les commandes et les workflows de formation ;",
  "envoyer des notifications opérationnelles liées au travail ;",
  "assurer la sécurité, la prévention des abus et la continuité de service.",
];

const userRights = [
  "demander l'accès, la rectification ou la suppression de leurs données ;",
  "supprimer leur compte depuis la page « Profil » de l'application ;",
  "contacter le support pour toute question liée à la confidentialité.",
];

export const metadata: Metadata = {
  title: "Politique de confidentialité - ZHAO Family",
  description:
    "Politique de confidentialité de l'application interne ZHAO Family pour Google Play.",
};

export default function PrivacyPolicyPage(): JSX.Element {
  return (
    <main className={styles.page} lang="fr">
      <article className={styles.card} aria-labelledby="privacy-policy-title">
        <p className={styles.kicker}>ZHAO Family</p>

        <header className={styles.header}>
          <h1 id="privacy-policy-title">Politique de confidentialité</h1>
          <p>
            Cette politique décrit le traitement des données dans l'application interne ZHAO
            Family, utilisée par les employés et responsables de boutique.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="controller-title">
          <h2 id="controller-title">Responsable et contact</h2>
          <p>
            Pour toute demande concernant les données personnelles traitées par l'application,
            contactez le support ZHAO Family :
          </p>
          <a className={styles.mailButton} href="mailto:zhaogroupe12@gmail.com">
            zhaogroupe12@gmail.com
          </a>
        </section>

        <section className={styles.section} aria-labelledby="data-title">
          <h2 id="data-title">Données collectées</h2>
          <ul className={styles.list}>
            {collectedData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="purpose-title">
          <h2 id="purpose-title">Finalités</h2>
          <ul className={styles.list}>
            {dataPurposes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="sharing-title">
          <h2 id="sharing-title">Partage et sécurité</h2>
          <p>
            Les données sont utilisées pour fournir les services internes ZHAO Family. Elles ne
            sont pas vendues. Des prestataires techniques peuvent les traiter uniquement pour
            l'hébergement, l'envoi de notifications, le support ou la sécurité du service.
          </p>
          <p>
            Les échanges avec les services de production utilisent des connexions chiffrées. Les
            mots de passe ne sont pas stockés en clair.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="rights-title">
          <h2 id="rights-title">Droits des utilisateurs</h2>
          <ul className={styles.list}>
            {userRights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            La suppression de compte se fait directement depuis la page « Profil » de
            l'application, avec confirmation par mot de passe. La page dédiée explique ce parcours.
          </p>
          <a className={styles.mailButton} href="/delete-account">
            Ouvrir la page de suppression
          </a>
        </section>

        <section className={styles.section} aria-labelledby="retention-title">
          <h2 id="retention-title">Conservation</h2>
          <p>
            Les données sont conservées pendant la durée nécessaire aux usages internes, puis
            supprimées ou anonymisées lorsqu'elles ne sont plus nécessaires, sauf obligation légale,
            comptable, de sécurité ou de prévention des abus.
          </p>
        </section>

        <footer className={styles.footer}>Dernière mise à jour : 18 juin 2026</footer>
      </article>
    </main>
  );
}
