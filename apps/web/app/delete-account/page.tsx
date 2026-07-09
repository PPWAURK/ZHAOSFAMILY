import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "./page.module.css";

const selfDeleteSteps = [
  "connectez-vous à votre compte ZHAO Family ;",
  "ouvrez la page « Profil » depuis le tableau de bord ou l'accueil mobile ;",
  "sélectionnez « Supprimer mon compte » ;",
  "saisissez votre mot de passe actuel pour confirmer l'action.",
];

const deletedData = [
  "compte utilisateur ;",
  "nom et prénom ;",
  "adresse e-mail ;",
  "informations de profil ;",
  "données liées à l'utilisation de l'application ;",
  "données associées au compte lorsque leur conservation n'est plus nécessaire.",
];

export const metadata: Metadata = {
  title: "Suppression de compte - ZHAO Family",
  description:
    "Supprimer votre compte et les données associées depuis le profil ZHAO Family.",
};

export default function DeleteAccountPage(): JSX.Element {
  return (
    <main className={styles.page} lang="fr">
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Navigation pages publiques">
          <a href="/" className={styles.navBrand}>
            ZHAO&apos;s Family
          </a>
          <div className={styles.navLinks}>
            <a href="/privacy" className={styles.navLink}>
              Politique de confidentialité
            </a>
            <a href="/support" className={styles.navLink}>
              Support
            </a>
            <a
              href="/delete-account"
              className={`${styles.navLink} ${styles.navLinkActive}`}
              aria-current="page"
            >
              Suppression de compte
            </a>
          </div>
        </nav>

        <article className={styles.card} aria-labelledby="delete-account-title">
          <div className={styles.headerBlock}>
            <p className={styles.kicker}>ZHAO&apos;s Family</p>

            <header className={styles.header}>
              <h1 id="delete-account-title">Suppression de compte et des données</h1>
              <p className={styles.lede}>Cette page concerne l&apos;application ZHAO Family.</p>
            </header>
          </div>

          <section className={styles.section} aria-labelledby="request-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="request-title">
                Supprimer votre compte
              </h2>
              <p>
                La suppression de compte est désormais disponible directement dans
                l&apos;application. Il n&apos;est plus nécessaire d&apos;envoyer une demande par
                e-mail au support pour supprimer votre compte.
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="details-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="details-title">
                Étapes à suivre
              </h2>
              <p>Pour supprimer votre compte :</p>
              <ul className={styles.list}>
                {selfDeleteSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <p>
                Cette confirmation par mot de passe permet de vérifier que vous êtes bien le
                titulaire du compte concerné.
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="delay-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="delay-title">
                Délai de traitement
              </h2>
              <p>
                Après confirmation, votre compte est désactivé et les informations personnelles
                liées au profil sont supprimées ou anonymisées. Certaines données peuvent toutefois
                être conservées temporairement lorsqu&apos;une obligation légale, comptable, de
                sécurité ou de prévention des abus l&apos;exige.
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="deleted-data-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="deleted-data-title">
                Données supprimées
              </h2>
              <ul className={styles.list}>
                {deletedData.map((dataItem) => (
                  <li key={dataItem}>{dataItem}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="retained-data-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="retained-data-title">
                Données pouvant être conservées temporairement
              </h2>
              <p>
                Certaines données peuvent être conservées pendant une durée limitée si cela est
                nécessaire pour respecter des obligations légales, comptables, de sécurité ou de
                prévention des abus.
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="retention-title">
            <div className={styles.sectionBody}>
              <h2 className={styles.sectionTitle} id="retention-title">
                Durée de conservation supplémentaire
              </h2>
              <p>
                Les données conservées pour des raisons légales ou administratives peuvent être
                conservées jusqu&apos;à la durée strictement nécessaire, selon les obligations
                applicables. Après cette période, elles seront supprimées ou anonymisées.
              </p>
            </div>
          </section>

          <footer className={styles.footer}>Dernière mise à jour : 9 juillet 2026</footer>
        </article>
      </div>
    </main>
  );
}
