# Déploiement (CI/CD) — Backend

Guide opérationnel du déploiement continu du **backend**, adapté à
l'infrastructure réelle du serveur (relevée le 2026-06-17).

> Le **web** est hébergé sur un autre cloud (hors de ce dépôt) et n'est pas
> géré ici. Le **mobile** se publie via EAS. Ce pipeline ne couvre que le backend.

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
> (`apps/backend/.env.production` sur le serveur).
>
> Les conteneurs `/backend1` (:4000) et `/backend2` (:3000, image GitLab) sont
> d'autres déploiements indépendants — hors périmètre.

## Pipeline

| Workflow | Déclenchement |
| --- | --- |
| `.github/workflows/deploy-backend.yml` | push `main` sur `apps/backend/**`, `packages/**`, `pnpm-lock.yaml`, ou dispatch manuel |

Le backend se déploie en SSH : `git checkout -f -B main origin/main` →
`pnpm install --frozen-lockfile` → `pnpm --filter backend build` (génère le
client Prisma) → `pm2 reload zhao-family-backend`.

## Secrets GitHub (Settings → Secrets and variables → Actions)

| Secret | Valeur |
| --- | --- |
| `DEPLOY_SSH_HOST` | `51.178.46.102` |
| `DEPLOY_SSH_USER` | `ubuntu` (membre du groupe docker) |
| `DEPLOY_SSH_KEY` | clé privée SSH dédiée (PEM complet) |
| `DEPLOY_SSH_PORT` | `22` |
| `DEPLOY_DIR` | `/opt/zhao-family` |

## Environnement backend sur le serveur

`apps/backend/.env.production` est **géré à la main sur le serveur** (gitignoré,
jamais committé ni écrasé par le déploiement). Variables clés pour cette infra :

```
PORT=3002
API_PREFIX=api                                   # Nginx ajoute déjà /api/ via /backend3/
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
