# Backend

Backend NestJS minimal pour le monorepo.

## Démarrage local

1. `cp .env.example .env`
2. Vérifier que le conteneur MySQL courant `webapp2026-mysql` tourne sur `127.0.0.1:3306`
3. Depuis la racine du dépôt: `npm run db:pull`
4. Depuis la racine du dépôt: `npm run db:generate`
5. Depuis la racine du dépôt: `npm run dev:api`

## Vérification

- API: `http://localhost:3002/api`
- Healthcheck: `GET http://localhost:3002/api/health`
- Accès MySQL direct: `docker exec -it webapp2026-mysql mysql -uroot -ppassword webapp2026`
