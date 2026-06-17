# Déploiement (CI/CD)

Guide opérationnel. Mis en place phase 6 du plan de finition, **adapté à
l'infrastructure existante** du serveur (relevée le 2026-06-17).

## Architecture réelle

| Composant | Hébergement | Détail |
| --- | --- | --- |
| Backend | **PM2** (process `zhao-family-backend`) | `/opt/zhao-family/apps/backend/dist/main.js`, écoute `127.0.0.1:3002`, `API_PREFIX=api` |
| MySQL | conteneur Docker `zhao-family-mysql` | `127.0.0.1:3310 -> 3306` (données existantes, **ne pas recréer**) |
| MinIO | conteneur Docker `zhao-family-minio` | `127.0.0.1:9010 -> 9000`, console `9011` |
| Web | **GitHub Pages** (export statique) | workflow `deploy-web.yml` |
| Nginx | reverse proxy | `api.zhaoplatforme.com/backend3/` → `127.0.0.1:3002/api/` |

> Le backend tourne **directement via PM2** (pas en conteneur). MySQL et MinIO
> sont des conteneurs Docker pré-existants avec des données de production : le
> déploiement **ne les touche pas**, il s'y connecte via leurs ports hôte
> (`apps/backend/.env.production` sur le serveur).
>
> Les conteneurs `/backend1` (:4000) et `/backend2` (:3000, image GitLab) sont
> d'autres déploiements indépendants — hors périmètre.

## Pipelines

| App | Workflow | Déclenchement |
| --- | --- | --- |
| Backend | `.github/workflows/deploy-backend.yml` | push `main` sur `apps/backend/**`, `packages/**`, `pnpm-lock.yaml`, ou manuel |
| Web | `.github/workflows/deploy-web.yml` | push `main` sur `apps/web/**`, `packages/**`, `pnpm-lock.yaml`, ou manuel |

Le backend se déploie en SSH : `git reset --hard origin/main` →
`pnpm install` → `pnpm --filter backend build` (génère le client Prisma) →
`pm2 reload zhao-family-backend`.

## Secrets GitHub (backend)

`Settings → Secrets and variables → Actions → Secrets` :

| Secret | Valeur |
| --- | --- |
| `DEPLOY_SSH_HOST` | IP / hostname du serveur |
| `DEPLOY_SSH_USER` | `ubuntu` (membre du groupe docker) |
| `DEPLOY_SSH_KEY` | clé privée SSH dédiée (PEM complet) |
| `DEPLOY_SSH_PORT` | port SSH (ex. `22`) |
| `DEPLOY_DIR` | `/opt/zhao-family` |

## Variables GitHub (web, optionnelles)

| Variable | Défaut | Quand |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.zhaoplatforme.com/backend3` | si l'URL API change |
| `WEB_BASE_PATH` | *(vide)* | site projet Pages → `/ZHAOSFAMILY` ; domaine custom racine → vide |
| `WEB_CNAME` | *(vide)* | domaine custom à écrire dans `out/CNAME` |

Activer Pages : `Settings → Pages → Source = GitHub Actions`.

## Environnement backend sur le serveur

`apps/backend/.env.production` est **géré à la main sur le serveur** (gitignoré,
jamais committé ni écrasé par le déploiement). Variables clés pour cette infra :

```
PORT=3002
API_PREFIX=api                                   # Nginx ajoute déjà /api/ via /backend3/
DATABASE_URL="mysql://<user>:<pwd>@127.0.0.1:3310/zhao_family"   # conteneur zhao-family-mysql
AUTH_TOKEN_SECRET=<openssl rand -base64 48>
CORS_ORIGINS="https://zhaoplatforme.com"
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
pm2 status zhao-family-backend                       # online
curl -s https://api.zhaoplatforme.com/backend3/health   # database up
```
