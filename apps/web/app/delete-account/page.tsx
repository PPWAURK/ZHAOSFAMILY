import type { Metadata } from "next";
import type { JSX } from "react";

import styles from "./page.module.css";

const requestDetails = [
  "l'adresse e-mail utilisée dans l'application ;",
  "votre nom ou identifiant utilisateur si disponible ;",
  "le nom de l'application : ZHAO Family ;",
  "la mention claire que vous souhaitez supprimer votre compte et vos données associées.",
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
    "Demander la suppression de votre compte et des données associées pour l'application ZHAO Family.",
};

export default function DeleteAccountPage(): JSX.Element {
  return (
    <main className={styles.page} lang="fr">
      <article className={styles.card} aria-labelledby="delete-account-title">
        <p className={styles.kicker}>ZHAO Family</p>

        <header className={styles.header}>
          <h1 id="delete-account-title">Suppression de compte et des données</h1>
          <p>Cette page concerne l'application ZHAO Family.</p>
        </header>

        <section className={styles.section} aria-labelledby="request-title">
          <h2 id="request-title">Demander la suppression</h2>
          <p>
            Si vous souhaitez supprimer votre compte utilisateur ainsi que les données associées,
            vous pouvez envoyer une demande par e-mail à l'adresse suivante :
          </p>
          <a className={styles.mailButton} href="mailto:zhaogroupe12@gmail.com">
            zhaogroupe12@gmail.com
          </a>
        </section>

        <section className={styles.section} aria-labelledby="details-title">
          <h2 id="details-title">Informations à fournir</h2>
          <p>Dans votre message, veuillez indiquer :</p>
          <ul className={styles.list}>
            {requestDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
          <p>
            Après réception de votre demande, nous procéderons à une vérification afin de confirmer
            que vous êtes bien le titulaire du compte concerné.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="delay-title">
          <h2 id="delay-title">Délai de traitement</h2>
          <p>
            Les demandes de suppression de compte sont traitées dans un délai maximum de{" "}
            <strong>30 jours</strong>.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="deleted-data-title">
          <h2 id="deleted-data-title">Données supprimées</h2>
          <ul className={styles.list}>
            {deletedData.map((dataItem) => (
              <li key={dataItem}>{dataItem}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="retained-data-title">
          <h2 id="retained-data-title">Données pouvant être conservées temporairement</h2>
          <p>
            Certaines données peuvent être conservées pendant une durée limitée si cela est
            nécessaire pour respecter des obligations légales, comptables, de sécurité ou de
            prévention des abus.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="retention-title">
          <h2 id="retention-title">Durée de conservation supplémentaire</h2>
          <p>
            Les données conservées pour des raisons légales ou administratives peuvent être
            conservées jusqu'à la durée strictement nécessaire, selon les obligations applicables.
            Après cette période, elles seront supprimées ou anonymisées.
          </p>
        </section>

        <footer className={styles.footer}>Dernière mise à jour : 17 juin 2026</footer>
      </article>
    </main>
  );
}
