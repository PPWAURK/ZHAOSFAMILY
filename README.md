<p align="center">
  <img src="apps/web/public/logo2024/logo2024.jpg" alt="Logo ZHAO" width="320" />
</p>

<h1 align="center">ZHAO's Family — 赵</h1>

<p align="center">
  <strong>Plateforme de gestion et d'exploitation numérique pour la restauration</strong>
  <br />
  Internal Restaurant Operations Platform
</p>

<p align="center">
  <img src="apps/web/public/logo2024/logozhao正方形.jpg" alt="Logo ZHAO carré" width="80" />
</p>

<p align="center">
  — Depuis 2011 —
</p>

---

## Vue d'ensemble

ZHAO's Family est un monorepo full-stack qui alimente les opérations quotidiennes du groupe de restaurants ZHAO. Il relie un **tableau de bord web Next.js** (pour les gestionnaires et le personnel administratif), une **application mobile Expo React Native** (pour les équipes en restaurant) et une **API backend NestJS** reposant sur MySQL.

La plateforme centralise les achats, les stocks, la gestion des fournisseurs, la formation du personnel, le recrutement, la communication interne et les flux administratifs — remplaçant les processus fragmentés sur papier et tableurs par un système numérique unifié.

> **Stack technique** : Next.js 15 (App Router) · Expo React Native · NestJS · MySQL (Prisma ORM) · pnpm workspaces · TypeScript · Turborepo · Zustand · TanStack Query · Axios · MinIO (stockage objet) · Docker

---

## Identité de marque

ZHAO (赵 / ZHAO's) est un groupe de restaurants chinois fondé en 2011. L'identité de marque s'articule autour de l'esthétique traditionnelle chinoise, exprimée par une palette rouge et blanc, une typographie calligraphique et des motifs culturels. Toutes les surfaces de la plateforme — web, mobile et exports papier — déclinent ce langage visuel de manière cohérente.

| Élément | Détail |
|---|---|
| Nom de la marque | ZHAO / ZHAO's Family / 赵 |
| Fondation | 2011 |
| Couleur principale | Rouge chinois (#CC0000) |
| Ressources graphiques | `apps/web/public/logo2024/`, `apps/web/public/ZHAO-元素element/` |

---

## Architecture

```text
zhao-family/
├── apps/
│   ├── web/              Dashboard Next.js (gestionnaires, bureau)
│   ├── mobile/           App Expo React Native (équipes restaurant)
│   └── backend/          API REST NestJS + Prisma + MinIO
├── packages/
│   ├── api/              Client Axios partagé, modules API, clés de requête
│   ├── auth/             Store d'authentification partagé et orchestration
│   ├── types/            DTOs partagés, contrats API, types sécurisés
│   └── utils/            Fonctions utilitaires pures
├── docker-compose.yml    MySQL 8.4 + MinIO
├── turbo.json            Orchestration des tâches Turborepo
└── pnpm-workspace.yaml   Définition du workspace monorepo
```

### Principes de conception

- **UI séparée par plateforme** : Web et Mobile ne partagent jamais de composants d'interface. Chacun cible son propre terminal et son rôle utilisateur.
- **Logique partagée via packages** : Les clients API, les flux d'authentification, les DTOs et les utilitaires sont mutualisés dans `packages/*`, garantissant que les contrats backend sont typés de bout en bout.
- **Contrôleurs légers, services riches** : Les contrôleurs backend se contentent de parser les requêtes et de déléguer ; la logique métier réside dans les services.
- **RBAC** : Le contrôle d'accès basé sur les rôles est appliqué au niveau API via des guards réutilisables, les rôles et permissions étant stockés en base de données.

---

## Fonctionnalités

### Achats & Supply Chain

| Fonctionnalité | Description |
|---|---|
| **Bons de commande** | Créer, consulter et gérer les bons de commande fournisseurs avec génération PDF |
| **Historique des commandes** | Parcourir et filtrer les commandes passées par restaurant |
| **Retours** | Enregistrer les retours fournisseurs avec suivi des motifs et photos par article |
| **Stocks** | Suivi en temps réel des mouvements de stock avec journalisation des écarts |
| **Fournisseurs** | Gérer les catalogues fournisseurs, références produits et tarifs |
| **Produits** | Catalogue produits multi-spécifications et multi-devises (chinois/français) |

### Gestion du personnel

| Fonctionnalité | Description |
|---|---|
| **Authentification** | Connexion email/mot de passe avec rotation des refresh tokens et flux d'invitation |
| **RBAC** | Contrôle d'accès granulaire basé sur les rôles et permissions |
| **Profil** | Paramètres personnels, préférences linguistiques (FR/CN), gestion du compte |
| **Recrutement** | Demander et approuver les recrutements par type de contrat et poste |

### Formation

| Fonctionnalité | Description |
|---|---|
| **Bibliothèque de matériel** | Téléverser et organiser vidéos, PDFs et images de formation par poste |
| **Espace de formation** | Les employés consultent le matériel assigné avec suivi de progression |
| **Rapports de progression** | Statut de complétion et scores par utilisateur et par matériel |
| **Postes** | Catalogue hiérarchique des postes avec noms multilingues (FR/CN/EN) |

### Communication interne

| Fonctionnalité | Description |
|---|---|
| **Publications tableau de bord** | Annonces d'entreprise, mises à jour des politiques et actualités avec pièces jointes |
| **Visibilité ciblée** | Les publications peuvent être restreintes par rôle, restaurant ou niveau hiérarchique |

### Tableau de bord & Reporting

| Fonctionnalité | Description |
|---|---|
| **Vue par restaurant** | Tableau de bord par établissement avec indicateurs clés |
| **Fil d'actualité** | Flux d'actualités intégré depuis les publications internes |

---

## Modèle de données (Entités principales)

```
Restaurant ──┬── User ──┬── UserRole ── Role ── RolePermission ── Permission
             │           └── RefreshSession
             ├── PurchaseOrder ── PurchaseOrderItem ── PurchaseReturnItem
             │                                       └── PurchaseReturn
             ├── DashboardPost
             └── RecruitmentRequest

Supplier ─── Product ─── InventoryMovement

TrainingPosition ─── TrainingMaterial ─── TrainingMaterialProgress
```

---

## Démarrage rapide

### Prérequis

- Node.js >= 20
- pnpm (activable via Corepack)
- Docker Desktop

```bash
# Activer pnpm avec Corepack
corepack enable
corepack prepare pnpm@11.1.3 --activate

# Installer les dépendances
pnpm install
```

### Base de données

```bash
# Démarrer MySQL et MinIO
pnpm db:up

# Générer le client Prisma
pnpm db:generate

# (Optionnel) Exécuter les migrations et le seed
pnpm db:migrate
pnpm db:seed
```

### Développement

```bash
# Tout démarrer (web + API en parallèle)
pnpm dev

# Ou séparément :
pnpm dev:web       # http://localhost:3000
pnpm dev:api       # http://localhost:3002/api
pnpm dev:mobile    # Serveur de développement Expo
```

### Builds mobiles

```bash
pnpm mobile:android    # Build natif Android (JDK + Android Studio requis)
pnpm mobile:ios        # Build natif iOS (Xcode + CocoaPods requis)
```

---

## Commandes utiles

```bash
pnpm build              # Builder toutes les apps
pnpm build:web          # Builder web uniquement
pnpm build:api          # Builder backend uniquement
pnpm typecheck          # Vérification TypeScript sur le monorepo
pnpm lint               # ESLint sur tous les packages
pnpm format             # Formatage Prettier

# Base de données
pnpm db:pull            # Introspecter la BDD existante dans le schéma Prisma
pnpm db:push            # Pousser le schéma sans migration
pnpm db:seed            # Exécuter le script de seed
pnpm db:logs            # Suivre les logs du conteneur MySQL

# Tests
pnpm --filter backend test          # Tests unitaires backend
pnpm --filter backend test:e2e      # Tests e2e backend
pnpm mobile:test                    # Tests mobile
pnpm mobile:lint                    # Lint mobile
```

---

## URLs locales

| Service | URL |
|---|---|
| Dashboard web | `http://localhost:3000` |
| API backend | `http://localhost:3002/api` |
| Health check | `http://localhost:3002/api/health` |
| Console MinIO | `http://localhost:9001` |
| CLI MySQL | `docker exec -it zhao-backend-mysql mysql -uzhao -pdev_pass zhao_family` |

---

## Variables d'environnement

Copier les fichiers d'exemple et renseigner vos valeurs locales :

```bash
cp apps/web/.env.example apps/web/.env
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Préfixes clés :
- `NEXT_PUBLIC_*` — Variables d'environnement côté client web
- `EXPO_PUBLIC_*` — Variables d'environnement côté client mobile

Ne pas commiter les fichiers `.env` ni les secrets de production.

---

## Règles d'architecture

- **L'UI reste spécifique à chaque plateforme** : Web et Mobile ne partagent pas de composants.
- **Les DTOs, clients API, auth et utilitaires** sont mutualisés dans `packages/*`.
- **Les appels API fonctionnels** appartiennent aux modules de package ou aux services fonctionnels, pas aux écrans.
- **Les réponses API** suivent une structure cohérente — les motifs succès, erreur et pagination sont uniformes.
- **Les contrôleurs backend** restent légers ; toute la logique métier réside dans les services.
- **Toute entrée externe** est validée via les DTOs avec `class-validator`.
- **MinIO** stocke les supports de formation, les ressources média et les pièces jointes.
- **Les variables d'environnement** sont spécifiques à chaque plateforme par convention.

---

## Maturité du projet

Ce monorepo est un système de niveau production activement utilisé dans les opérations de restauration. Le codebase suit des conventions professionnelles :

- TypeScript strict sans abus de `any`
- Architecture NestJS modulaire
- Schéma Prisma complet avec index optimisés
- Tests Jest sur le backend (`*.spec.ts` + e2e)
- Application mobile avec NativeWind et Expo Router
- Cache Turborepo pour des builds rapides

---

## Licence

Privé — usage interne. ZHAO's Family (赵). Tous droits réservés.
