# Déploiement (CI/CD)

Guide opérationnel du déploiement continu **backend** + **web**, adapté à
l'infrastructure réelle (relevée le 2026-06-17).

> Le **backend** tourne sous PM2 sur le VPS. Le **web** (export statique Next.js)
> est hébergé sur l'**hébergement mutualisé OVH** qui sert `zhaoplatforme.com`,
> mis à jour par SFTP. Le **mobile** se publie via EAS, déclenchable localement
> depuis ZHAO Monitor.

## Architecture réelle

| Composant | Hébergement | Détail |
| --- | --- | --- |
| Backend | **PM2** (process `zhao-family-backend`) | `/opt/zhao-family/apps/backend/dist/main.js`, écoute `127.0.0.1:3002`, `API_PREFIX=api` |
| MySQL | conteneur Docker `zhao-family-mysql` | `127.0.0.1:3310 -> 3306` (données existantes, **ne pas recréer**) |
| MinIO | conteneur Docker `zhao-family-minio` | `127.0.0.1:9010 -> 9000`, console `9011` |
| Nginx | reverse proxy | `api.zhaoplatforme.com/backend3/` → `127.0.0.1:3002/api/` |

> Le backend tourne **directement via PM2** (pas en conteneur). MySQL et MinIO
> sont des conteneurs Docker pré-existants avec des données de production : le
> déploiement **ne les touche pas**, il s'y connecte via leurs ports hôte
> (`apps/backend/.env` sur le serveur).
>
> Les conteneurs `/backend1` (:4000) et `/backend2` (:3000, image GitLab) sont
> d'autres déploiements indépendants — hors périmètre.

## Pipelines

| Workflow | Déclenchement |
| --- | --- |
| `.github/workflows/deploy-backend.yml` | push `main` sur `apps/backend/**`, `packages/**`, `pnpm-lock.yaml`, ou dispatch manuel |
| `.github/workflows/deploy-web.yml` | push `main` sur `apps/web/**`, `packages/**`, `pnpm-lock.yaml`, ou dispatch manuel |

**Backend** (SSH → PM2) : `git checkout -f -B main origin/main` →
`pnpm install --frozen-lockfile` → `pnpm --filter backend build` (génère le
client Prisma) → `pm2 reload zhao-family-backend`.

**Web** (build → SFTP) : `pnpm --filter @zhao/web build` (export statique vers
`apps/web/out/`, `NEXT_PUBLIC_API_BASE_URL` injecté au build) → upload `lftp`
`mirror -R` vers le docroot OVH. Pas de `--delete` (n'efface pas `.htaccess`,
`.well-known`, etc.). Apex à la racine → pas de `basePath`.

**Mobile** (EAS) : `apps/mobile/eas.json` définit le profil `production`.
ZHAO Monitor peut lancer les commandes EAS localement depuis `apps/mobile` pour
éviter de saisir les commandes à la main.

## Secrets GitHub (Settings → Secrets and variables → Actions)

**Backend :**

| Secret | Valeur |
| --- | --- |
| `DEPLOY_SSH_HOST` | `152.228.137.101` |
| `DEPLOY_SSH_USER` | `ubuntu` (membre du groupe docker) |
| `DEPLOY_SSH_KEY` | clé privée SSH dédiée (PEM complet) |
| `DEPLOY_SSH_PORT` | `22` |
| `DEPLOY_DIR` | `/opt/zhao-family` |

**Web (OVH SFTP) :**

| Secret | Valeur |
| --- | --- |
| `WEB_SFTP_HOST` | `ftp.cluster100.hosting.ovh.net` |
| `WEB_SFTP_USER` | `zhaofsx` |
| `WEB_SFTP_PASSWORD` | mot de passe SSH/SFTP OVH |
| `WEB_SFTP_PORT` | `22` |
| `WEB_SFTP_REMOTE_DIR` | docroot du site (ex. `www`) |

> Variable optionnelle `NEXT_PUBLIC_API_BASE_URL` (défaut
> `https://api.zhaosfamily.com/api`).

## Environnement backend sur le serveur

`apps/backend/.env` est **géré à la main sur le serveur** (gitignoré,
jamais committé ni écrasé par le déploiement). Variables clés pour cette infra :

```
PORT=3002
API_PREFIX=api                                   # Nginx ajoute déjà /api/ via /backend3/
PUBLIC_API_BASE_URL=https://api.zhaoplatforme.com/backend3
DATABASE_URL="mysql://<user>:<pwd>@127.0.0.1:3310/zhao_family"   # conteneur zhao-family-mysql
AUTH_TOKEN_SECRET=<openssl rand -base64 48>
CORS_ORIGINS="https://zhaoplatforme.com"         # ajouter les origines web réelles
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9010                                  # conteneur zhao-family-minio
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=company-private-files
BREVO_API_KEY=...        # vide = emails désactivés
AI_API_KEY=...           # vide = génération IA désactivée
```

## Migrations de schéma (manuel)

Le déploiement **ne lance pas** les migrations (risque sur des données de prod).
Quand le schéma change, après le déploiement :

```bash
cd /opt/zhao-family
pnpm db:deploy            # prisma migrate deploy
```

> ⚠️ `migrate deploy` suppose un historique de migrations initialisé. Sur une
> base amorcée hors migrations (dump legacy), utiliser `pnpm db:push` à la place.
> Le seed (`pnpm db:seed`) est réservé aux environnements de démo.

## Rollback

```bash
cd /opt/zhao-family
git reset --hard <sha-précédent>
pnpm install --frozen-lockfile
pnpm --filter backend build
pm2 reload zhao-family-backend --update-env
```

## Vérifications post-déploiement

```bash
pm2 status zhao-family-backend                          # online
curl -s https://api.zhaoplatforme.com/backend3/health   # database up
```
