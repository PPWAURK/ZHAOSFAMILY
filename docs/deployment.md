# Déploiement (CI/CD)

Guide opérationnel pour le déploiement des trois apps. Mis en place lors de la
phase 6 du plan de finition.

## Architecture cible

| App | Hébergement | Pipeline |
| --- | --- | --- |
| `apps/backend` | Serveur Ubuntu 24.04 auto-géré · Docker Compose (backend + MySQL + MinIO) · Nginx + HTTPS | `.github/workflows/deploy-backend.yml` (SSH → `docker compose up -d --build`) |
| `apps/web` | GitHub Pages (export statique Next.js) | `.github/workflows/deploy-web.yml` |
| `apps/mobile` | EAS Build / stores | Manuel via EAS (hors CI pour l'instant) |

- Backend public : `https://api.zhaoplatforme.com/backend3` (Nginx → `127.0.0.1:3002`).
- MySQL et MinIO ne sont **pas** exposés publiquement (réseau interne Compose).
- Le contrôle qualité (lint/typecheck/build/tests) tourne séparément dans
  `.github/workflows/ci.yml` sur chaque PR.

## Déclenchement

- **Backend** : push sur `main` touchant `apps/backend/**`, `docker-compose.prod.yml`,
  `pnpm-lock.yaml` ou le workflow lui-même ; ou `workflow_dispatch` manuel.
- **Web** : push sur `main` touchant `apps/web/**`, `packages/**`, `pnpm-lock.yaml`
  ou le workflow ; ou `workflow_dispatch` manuel.

## Secrets GitHub requis (backend)

`Settings → Secrets and variables → Actions → Secrets` :

| Secret | Description |
| --- | --- |
| `DEPLOY_SSH_HOST` | IP / hostname du serveur |
| `DEPLOY_SSH_USER` | utilisateur SSH (membre du groupe `docker`) |
| `DEPLOY_SSH_KEY` | clé privée SSH (PEM complet) autorisée sur le serveur |
| `DEPLOY_SSH_PORT` | port SSH (ex. `22`) |
| `DEPLOY_DIR` | chemin du clone du repo sur le serveur (ex. `/opt/zhao`) |

## Variables GitHub (web, optionnelles)

`Settings → Secrets and variables → Actions → Variables` :

| Variable | Défaut | Quand la définir |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.zhaoplatforme.com/backend3` | si l'URL de l'API change |
| `WEB_BASE_PATH` | *(vide)* | site **projet** Pages → `/ZHAOSFAMILY` ; domaine custom à la racine → laisser vide |
| `WEB_CNAME` | *(vide)* | domaine custom à écrire dans `out/CNAME`, ex. `zhaoplatforme.com` |

> ⚠️ `WEB_BASE_PATH` et `WEB_CNAME` vont ensemble : avec un domaine custom à la
> racine, garder `WEB_BASE_PATH` vide et renseigner `WEB_CNAME`. Avec l'URL
> projet `https://ppwaurk.github.io/ZHAOSFAMILY/`, mettre `WEB_BASE_PATH=/ZHAOSFAMILY`
> (sinon les assets `/_next/...` renvoient 404).

Activer Pages : `Settings → Pages → Source = GitHub Actions`.

## Mise en place initiale du serveur (une seule fois)

Prérequis : Docker + plugin compose installés, DNS `api.zhaoplatforme.com` pointant
sur le serveur.

```bash
# 1. Cloner le repo à l'emplacement de DEPLOY_DIR
sudo mkdir -p /opt/zhao && sudo chown "$USER" /opt/zhao
git clone https://github.com/PPWAURK/ZHAOSFAMILY.git /opt/zhao
cd /opt/zhao

# 2. Renseigner les variables d'environnement (NE PAS committer)
cp .env.prod.example .env                                   # MySQL + MinIO
cp apps/backend/.env.production.example apps/backend/.env.production
#   - .env                       : MYSQL_*, MINIO_ROOT_*
#   - apps/backend/.env.production: AUTH_TOKEN_SECRET, DATABASE_URL (host=mysql),
#     CORS_ORIGINS, BREVO_API_KEY, MinIO, AI_*  (les mots de passe DB/MinIO
#     doivent correspondre à .env)
#   Générer le secret : openssl rand -base64 48

# 3. Premier démarrage
docker compose -f docker-compose.prod.yml up -d --build

# 4. Initialiser le schéma de base de données (voir note ci-dessous)
```

### Note base de données ⚠️

`prisma migrate deploy` **ne peut pas** amorcer une base vide : la première
migration référence la table legacy `users` (issue d'un dump SQL, absente des
migrations). Deux cas :

- **Greenfield (base vide)** : pousser le schéma directement.
  ```bash
  docker compose -f docker-compose.prod.yml exec backend \
    sh -c 'cd /repo/apps/backend && npx prisma db push'
  ```
- **Reprise de données legacy** : importer d'abord le dump SQL dans MySQL, puis
  appliquer les migrations restantes avec `prisma migrate deploy`.

Le seed (`pnpm db:seed`) est optionnel et réservé aux environnements de démo.

### Nginx + HTTPS

Modèle fourni : [`deploy/nginx/api.zhaoplatforme.com.conf`](../deploy/nginx/api.zhaoplatforme.com.conf).

```bash
sudo cp deploy/nginx/api.zhaoplatforme.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.zhaoplatforme.com.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.zhaoplatforme.com   # certificat TLS + redirection
sudo nginx -t && sudo systemctl reload nginx
```

## Déploiements suivants

Automatiques au push sur `main`. Le workflow backend fait, côté serveur :
`git reset --hard origin/main` → `docker compose up -d --build` → `image prune`.
Les volumes `zhao_mysql_data` / `zhao_minio_data` persistent entre déploiements.

## Rollback

```bash
cd /opt/zhao
git reset --hard <sha-précédent>
docker compose -f docker-compose.prod.yml up -d --build
```

(ou relancer le workflow sur un commit antérieur via `workflow_dispatch`).

## Vérifications post-déploiement

```bash
docker compose -f docker-compose.prod.yml ps        # tous "healthy"
curl -s https://api.zhaoplatforme.com/backend3/health   # {"...":"up"}
```
