# Plan — Visibilité des modules pilotée par le poste (jobRole)

> Objectif (demande utilisateur) : **un compte sans le bon poste ne doit plus voir les entrées de menu des modules qui ne le concernent pas.**
> Décisions validées :
> 1. **Visibilité pilotée par le poste** (`user.jobRole`), PAS de nouvelles clés de permission backend ni de migration DB.
> 2. **Profondeur = masquer les entrées** (sidebar web + accueil/onglets mobile). Pas de garde de route lourde / page « accès refusé » dans ce lot.
> 3. Les 3 items déjà protégés par une vraie permission RBAC (`system.permission.manage`, `training.position.manage`, `recruitment.request.manage`) **gardent leur permission** ; on ajoute la visibilité par poste **en plus** (logique OU, déjà en place côté web).

---

## Phase 0 — Constats & briques autorisées (déjà vérifié, ne pas réinventer)

### Faits établis (avec sources)

- **Le poste arrive déjà au frontend.** `login`/`refresh`/`me` renvoient `user.permissions: string[]` ET `user.jobRole`. Dans [apps/backend/src/auth/auth.service.ts:771-773](apps/backend/src/auth/auth.service.ts#L771), `role`, `jobRole`, `position` mappent **tous** la même colonne `job_role`. → Côté front, utiliser `user.jobRole` (fallback `user.position` / `user.role`).
- **Type partagé déjà prêt :** `AuthUser` expose `permissions?: string[]`, `jobRole?`, `position?`, `role?` — voir [packages/types/src/auth/models.ts](packages/types/src/auth/models.ts). Aucun changement de type requis (au plus, documenter).
- **19 jobRoles existants** (source : `TRAINING_JOB_ROLE_POSITIONS` dans [apps/backend/prisma/seed.js:196-304](apps/backend/prisma/seed.js#L196)) :
  `holding`, `regional-manager`, `store-manager`, `front-manager`, `back-manager`, `front-assistant`, `back-assistant`, `front-of-house`, `back-of-house`, `front-host`, `front-cashier`, `front-server`, `front-packer`, `front-bar`, `back-dishwasher`, `back-noodle`, `back-hot-appetizer`, `back-cold-appetizer`, `back-rice`.
- **Le filtrage par poste existe déjà côté web, partiellement.** [apps/web/src/features/dashboard/components/Sidebar.js:55-70](apps/web/src/features/dashboard/components/Sidebar.js#L55) implémente `canSeeNavItem` avec la logique OU : `visibleForJobRoles.includes(role)` **OU** (`!requiredPermission` **OU** `permissions.includes(requiredPermission)`). C'est exactement le modèle cible — il suffit de l'**étendre à tous les items** et de le **centraliser**.
- **Config nav web :** [apps/web/src/features/dashboard/constants/dashboard-copy.js:1-126](apps/web/src/features/dashboard/constants/dashboard-copy.js#L1) — `DASHBOARD_NAV` (4 groupes : `menu`, `learning`, `orders`, `people`). Seuls 3 items portent une règle aujourd'hui ; les autres (stores, profile, tous les orders/suppliers/inventory, training space/certifs/materials) sont visibles par tous.
- **Config nav mobile :** [apps/mobile/src/features/dashboard/dashboardCopy.ts](apps/mobile/src/features/dashboard/dashboardCopy.ts) — deux structures : `DASHBOARD_PRIMARY_NAV` (barre d'onglets bas : home/stores/orders/training/more, **aucune règle**) et `DASHBOARD_MORE_NAV_GROUPS` (le « Plus », champ `permission?` seulement, **pas** de `visibleForJobRoles`).
- **Filtre mobile actuel :** [apps/mobile/src/features/dashboard/DashboardHomeScreen.tsx:139-204](apps/mobile/src/features/dashboard/DashboardHomeScreen.tsx#L139) — `canSeeNavItem(item, permissions)` = `!item.permission || permissions.includes(item.permission)`. Ne gère QUE la permission, pas le poste, et ne filtre pas la barre d'onglets bas.
- **Garde d'auth existante (à NE PAS dupliquer) :** [apps/web/src/features/auth/components/RequireAuth.tsx](apps/web/src/features/auth/components/RequireAuth.tsx) ne vérifie que « connecté ». On ne touche pas aux routes dans ce lot (décision 2).
- **Emplacement des utilitaires partagés :** `@zhao/utils` (`packages/utils/src`) — destination naturelle d'un helper pur de visibilité, importable par web ET mobile (`workspace:*`).

### Briques autorisées (à COPIER, pas à inventer)

- Logique OU `canSeeNavItem` de [Sidebar.js:55-70](apps/web/src/features/dashboard/components/Sidebar.js#L55) → à extraire telle quelle dans `@zhao/utils`.
- Forme de règle existante : `{ requiredPermission?: string; visibleForJobRoles?: string[] }` (web) / `{ permission?: string }` (mobile). Cible unifiée : **les deux champs** sur les deux plateformes.
- `user.jobRole` comme source du poste (fallback `position`/`role`).

### Anti-patterns à éviter

- ❌ Créer des clés de permission `orders.access`, `suppliers.access`, etc. (explicitement écarté).
- ❌ Ajouter une migration Prisma ou modifier le seed des rôles.
- ❌ Ajouter des gardes de route / pages « 403 » (hors périmètre de ce lot).
- ❌ Inventer un nouveau champ utilisateur : `jobRole` existe déjà, ne pas ajouter `poste`/`grade`.
- ❌ Dupliquer la logique de visibilité dans 3 fichiers : **une seule** source dans `@zhao/utils`.

---

## Phase 1 — Source de vérité partagée (`@zhao/utils`)

**But :** un seul module qui (a) liste les jobRoles, (b) porte la **matrice poste → modules visibles**, (c) expose un helper pur `canSeeNavEntry`.

### À implémenter

1. Créer `packages/utils/src/access/nav-visibility.ts` :
   - `export type NavVisibilityRule = { requiredPermission?: string; visibleForJobRoles?: string[] };`
   - `export type NavViewer = { jobRole?: string | null; position?: string | null; role?: string | null; permissions?: string[] | null };`
   - `export function resolveJobRole(viewer: NavViewer): string` → `(viewer.jobRole || viewer.position || viewer.role || "").trim()`.
   - `export function canSeeNavEntry(viewer: NavViewer, rule: NavVisibilityRule | undefined): boolean` — **copier la logique OU** de [Sidebar.js:55-70](apps/web/src/features/dashboard/components/Sidebar.js#L55) :
     ```ts
     if (!rule) return true;
     const jobRole = resolveJobRole(viewer);
     if (rule.visibleForJobRoles?.includes(jobRole)) return true;
     const perms = viewer.permissions ?? [];
     return !rule.requiredPermission || perms.includes(rule.requiredPermission);
     ```
   - Constantes de groupes de postes (pour éviter de répéter 19 chaînes) :
     ```ts
     export const MANAGEMENT_JOB_ROLES = [
       "holding", "regional-manager", "store-manager",
       "front-manager", "back-manager",
     ] as const;
     export const ALL_JOB_ROLES = [/* les 19, copiés depuis seed.js:196-304 */] as const;
     ```
2. Réexporter depuis `packages/utils/src/index.ts` (vérifier le baril existant et suivre le même style d'export).

### Matrice proposée (défaut — à confirmer en exécution avec l'utilisateur)

| Module / item nav            | Postes autorisés (`visibleForJobRoles`)            | Permission conservée            |
|------------------------------|----------------------------------------------------|---------------------------------|
| Accueil, Profil, Espace formation, Certifications, Ressources | **tous** (pas de règle) | — |
| Gestion boutiques (`stores`) | `MANAGEMENT_JOB_ROLES`                              | —                               |
| Commandes (new/history/stats)| `MANAGEMENT_JOB_ROLES`                              | —                               |
| Fournisseurs (`suppliers`)   | `MANAGEMENT_JOB_ROLES`                              | —                               |
| Inventaire ZHAO Bureau       | `holding`, `regional-manager`                       | —                               |
| Rôles système (`permissions`)| `holding` (en plus)                                 | `system.permission.manage`      |
| Postes (`training-positions`)| `holding`, `regional-manager`                       | `training.position.manage`      |
| Demandes recrutement         | `store-manager` (déjà en place)                     | `recruitment.request.manage`    |

> Ce tableau est le **seul vrai point de décision produit**. Le mécanisme ne dépend pas de ces valeurs exactes : l'exécutant DOIT proposer ce défaut à l'utilisateur et ajuster avant de figer.

### Vérification

- `pnpm --filter @zhao/utils typecheck` (si script présent) sinon `pnpm typecheck`.
- `grep -rn "canSeeNavEntry" packages/utils/src` renvoie le helper exporté.
- Test unitaire rapide (optionnel) : un viewer `back-dishwasher` sans permission → `canSeeNavEntry(viewer, {visibleForJobRoles: MANAGEMENT_JOB_ROLES})` === `false`.

### Anti-pattern guards

- ❌ Ne pas mettre la matrice dans `@zhao/utils` si elle contient des libellés UI — `@zhao/utils` ne porte QUE postes + helper. Les libellés restent dans `dashboard-copy.js` / `dashboardCopy.ts`.
- ❌ Ne pas réécrire la logique OU « à la main » dans Sidebar/mobile en Phase 2-3 : importer `canSeeNavEntry`.

---

## Phase 2 — Câblage Web

### À implémenter

1. **Étendre la config nav** [apps/web/src/features/dashboard/constants/dashboard-copy.js](apps/web/src/features/dashboard/constants/dashboard-copy.js) : ajouter `visibleForJobRoles` (depuis `@zhao/utils`) sur chaque item selon la matrice Phase 1. Conserver les `requiredPermission` existants.
2. **Refactor `Sidebar.js`** [apps/web/src/features/dashboard/components/Sidebar.js:55-70](apps/web/src/features/dashboard/components/Sidebar.js#L55) : remplacer le `canSeeNavItem` local par un appel à `canSeeNavEntry(user, item)` importé de `@zhao/utils`. Supprimer la logique dupliquée (le calcul `userJobRoles`/`userPermissions` local). Garder le filtrage des groupes vides (`.filter(group => group.items.length > 0)`).
3. **Auditer l'accueil web** : vérifier [apps/web/src/features/dashboard/pages/DashboardPage.js](apps/web/src/features/dashboard/pages/DashboardPage.js) (et composants enfants) pour d'éventuels raccourcis/cartes vers orders/suppliers/inventory/stores en dur. Si présents, les filtrer avec `canSeeNavEntry`. Si l'accueil n'a pas de raccourcis, noter « rien à faire ».

### Vérification

- `pnpm --filter @zhao/web typecheck` puis `pnpm --filter @zhao/web lint`.
- `pnpm dev:web`, se connecter avec deux comptes (un `holding`, un poste terrain type `back-dishwasher`) et confirmer dans la sidebar : le poste terrain ne voit que Accueil/Profil/Formation ; le `holding` voit tout. (Si pas de comptes de test sous la main : forcer `user.jobRole` temporairement via le store, ou demander des identifiants.)
- `grep -n "permissions.includes\|userJobRoles" apps/web/src/features/dashboard/components/Sidebar.js` → ne doit plus montrer de logique de visibilité dupliquée.

### Anti-pattern guards

- ❌ Ne pas réintroduire le fallback « OU permission » à la main : il est dans `canSeeNavEntry`.
- ❌ Ne pas casser le rendu i18n (`item[lang]`) ni l'index `01/02/...` (recalculé après filtre, déjà géré par `.map((item, index) => ...)`).

---

## Phase 3 — Câblage Mobile

### À implémenter

1. **Unifier la forme de règle** dans [apps/mobile/src/features/dashboard/dashboardCopy.ts](apps/mobile/src/features/dashboard/dashboardCopy.ts) : ajouter `visibleForJobRoles?: string[]` à `DashboardNavItem` ET `DashboardMenuItem` (à côté de `permission?`).
2. **Renseigner la matrice** Phase 1 :
   - Sur `DASHBOARD_PRIMARY_NAV` (barre du bas) : ajouter `visibleForJobRoles` sur `stores` et `orders` (= `MANAGEMENT_JOB_ROLES`). `home`/`training`/`more` restent visibles par tous.
   - Sur `DASHBOARD_MORE_NAV_GROUPS` : `suppliers`, `inventory`, et items déjà permission-gatés selon la matrice.
3. **Refactor le filtre** [apps/mobile/src/features/dashboard/DashboardHomeScreen.tsx:139-204](apps/mobile/src/features/dashboard/DashboardHomeScreen.tsx#L139) : remplacer `canSeeNavItem(item, permissions)` par `canSeeNavEntry(user, item)` de `@zhao/utils` (passer `user` entier, pas seulement `permissions`).
4. **Filtrer la barre d'onglets du bas** : appliquer `canSeeNavEntry` à `DASHBOARD_PRIMARY_NAV` au rendu (aujourd'hui non filtrée). Vérifier que masquer un onglet ne casse pas la navigation par défaut (route active fallback = `home`).

### Vérification

- `pnpm --filter @zhao/mobile typecheck` puis `pnpm --filter @zhao/mobile lint`.
- `pnpm mobile:test` (jest-expo) si des tests touchent le dashboard.
- Vérif manuelle Expo : un poste terrain ne voit ni l'onglet « Commande » ni « Boutiques » en bas ; le `holding` voit tout.

### Anti-pattern guards

- ❌ Ne pas garder deux helpers de visibilité (mobile `canSeeNavItem` + web) : les deux pointent vers `canSeeNavEntry`.
- ❌ Ne pas laisser la barre d'onglets exposer un module masqué dans « Plus ».

---

## Phase 4 — Vérification finale

1. **Cohérence matrice** : `grep -rn "visibleForJobRoles" apps/web apps/mobile` → mêmes postes pour le même module des deux côtés.
2. **Anti-patterns** :
   - `grep -rn "orders.access\|suppliers.access\|inventory.access\|stores.access" apps/ packages/` → **0 résultat** (on n'a pas créé de fausses permissions).
   - `git diff --stat apps/backend prisma` → **aucun** changement backend/DB.
3. **Qualité** : `pnpm typecheck` puis `pnpm lint` (repo entier) au vert.
4. **Tableau de recette manuel** (par poste, web + mobile) : pour `holding`, `store-manager`, `back-dishwasher`, confirmer que les entrées visibles correspondent à la matrice validée.
5. Ne PAS prétendre « tests/lint OK » sans les avoir lancés (règle AGENTS.md).

---

## Notes d'exécution

- Ce lot est **frontend-only**. Le backend continue de 403 les données pour un compte qui forcerait une URL — on ne fait que masquer les entrées (décision 2). Un futur lot « gardes de route » pourra réutiliser `canSeeNavEntry` si besoin.
- Le **seul arbitrage produit** est la matrice (Phase 1). Tout le reste est mécanique. Faire valider la matrice avant Phase 2.
- Ordre d'exécution : Phase 1 → 2 → 3 → 4 (Phase 1 est bloquante pour 2 et 3).
