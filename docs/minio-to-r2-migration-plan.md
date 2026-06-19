# Plan : Migration MinIO → Cloudflare R2 (stockage objet)

> Décision : **garder le SDK `minio` (v8)** et le repointer vers l'endpoint S3 de R2.
> R2 est S3-compatible — le code applicatif change très peu, l'essentiel est config + migration des données.
> **Migrer les données existantes** : oui (rclone, en préservant les object keys).

---

## Contexte vérifié (état actuel du code)

- Tout le stockage passe par `apps/backend/src/minio/minio.service.ts` (SDK officiel `minio` v8.0.7).
- Opérations réellement utilisées : `putObject`, `fPutObject`, `getObject`, `getPartialObject` (Range/seek vidéo), `statObject`, `removeObject`, `bucketExists`, `makeBucket`.
- Consommateurs : `media`, `training` (`training.service.ts`, `training-quiz-generator.service.ts`), `dashboard-news`.
- Les fichiers sont **streamés via le backend** (`MediaController.getFile` → `stream.pipe(response)`), pas servis directement depuis le bucket.
- `MinioService` lit toujours `this.bucket` (config) pour récupérer un objet → la colonne `bucket` stockée en base (`schema.prisma:315`, et `attachment_bucket` `schema.prisma:484`) n'est qu'une métadonnée, **pas** utilisée à la lecture.
- Variables d'env actuelles (`apps/backend/.env.example:15-20`) : `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`.
- Compte R2 (depuis le dashboard) : Account ID `585bc0359f11466b43d1b8c4245e871b` → endpoint S3 `https://585bc0359f11466b43d1b8c4245e871b.r2.cloudflarestorage.com`.

---

## Phase 0 — Documentation Discovery (APIs autorisées)

Sources consultées :
- Cloudflare R2 → S3 API compatibility : https://developers.cloudflare.com/r2/api/s3/api/
- Cloudflare R2 → exemple SDK JS : https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/

**APIs / paramètres R2 confirmés (à utiliser tels quels) :**
- Endpoint S3 : `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (HTTPS, port **443**).
- **Region** : `auto` (les valeurs vide et `us-east-1` sont aliasées vers `auto` côté R2).
- Opérations supportées : `PutObject`, `GetObject` (**Range / partial GET supporté**), `HeadObject`, `DeleteObject`, `CreateBucket`, `HeadBucket`, `ListBuckets`. → couvre 100 % des appels du `MinioService` actuel.

**Anti-patterns / pièges à éviter :**
- ❌ Ne pas activer d'ACL, de server-side encryption KMS, de tagging/lifecycle/versioning : **non supportés par R2** (le code n'en utilise pas — ne pas en ajouter).
- ❌ Ne pas exposer le bucket en public ni configurer un domaine custom/CORS : inutile ici (tout passe par le backend). Bucket = **privé**.
- ❌ Ne pas migrer vers `@aws-sdk/client-s3` (hors scope, et risque de bug checksum CRC32 connu avec R2).
- ❌ Ne pas inventer d'options de constructeur `minio` : seules `endPoint`, `port`, `useSSL`, `region`, `accessKey`, `secretKey`, `pathStyle` existent.

---

## Phase 1 — Provisionner R2 (dashboard Cloudflare, manuel)

**À faire :**
1. Créer un bucket R2 nommé **exactement** comme `MINIO_BUCKET` actuel (`company-private-files`) — garde la colonne `bucket` en base cohérente, même si non utilisée à la lecture.
2. Créer un **R2 API Token** avec permission *Object Read & Write* (scope sur ce bucket). Récupérer **Access Key ID** + **Secret Access Key** (le secret n'est affiché qu'une fois).
3. Noter l'endpoint S3 : `https://585bc0359f11466b43d1b8c4245e871b.r2.cloudflarestorage.com`.

**Vérification :** le bucket apparaît dans la liste R2 ; le token est listé dans « API 令牌 ».

**Anti-pattern :** ne pas réutiliser les credentials MinIO (`minioadmin`) — ce sont les credentials R2 qui changent.

---

## Phase 2 — Adapter `MinioService` pour la region R2

**À implémenter (diff minimal) :**
1. Dans `apps/backend/src/minio/minio.service.ts`, ajouter `region` au constructeur `Minio.Client`, lu depuis la config avec défaut rétro-compatible :
   ```ts
   this.client = new Minio.Client({
     endPoint: this.configService.get<string>('MINIO_ENDPOINT', '127.0.0.1'),
     port: Number(this.configService.get<string>('MINIO_PORT', '9000')),
     useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
     region: this.configService.get<string>('MINIO_REGION', 'us-east-1'),
     accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', ''),
     secretKey: this.configService.get<string>('MINIO_SECRET_KEY', ''),
   });
   ```
   > `region` est une option valide du SDK `minio`. Garder le défaut `us-east-1` ne casse rien en local (MinIO l'ignore) et R2 l'aliase vers `auto`.
2. (Optionnel, robustesse) Dans `prepareBucket()`, remplacer le `'us-east-1'` codé en dur par la region de config pour rester cohérent :
   ```ts
   await this.client.makeBucket(this.bucket, this.configService.get<string>('MINIO_REGION', 'us-east-1'));
   ```
   En prod, le bucket existe déjà (Phase 1) → `bucketExists` renvoie `true` et `makeBucket` n'est jamais appelé.

**Vérification :**
- `pnpm --filter backend typecheck` passe.
- `pnpm --filter backend exec jest src/minio/minio.service.spec.ts` passe (adapter le spec si le constructeur mocké vérifie les options exactes).

**Anti-patterns :**
- ❌ Ne pas réécrire la logique métier ni renommer les méthodes (`uploadFile`, `getPartialFileStream`, etc.) — repointage uniquement.
- ❌ Ne pas retirer la gestion `ServiceUnavailableException` / codes réseau existante.

---

## Phase 3 — Migration des données MinIO → R2 (rclone)

**À faire (sur la machine de prod, hors build) :**
1. Installer rclone.
2. Configurer deux remotes S3 (provider `Cloudflare` pour R2, `Minio`/`Other` pour la source) — exemple `~/.config/rclone/rclone.conf` :
   ```ini
   [minioprod]
   type = s3
   provider = Minio
   access_key_id = <MINIO_ACCESS_KEY>
   secret_access_key = <MINIO_SECRET_KEY>
   endpoint = http://127.0.0.1:9000

   [r2]
   type = s3
   provider = Cloudflare
   access_key_id = <R2_ACCESS_KEY_ID>
   secret_access_key = <R2_SECRET_ACCESS_KEY>
   endpoint = https://585bc0359f11466b43d1b8c4245e871b.r2.cloudflarestorage.com
   region = auto
   ```
3. Dry-run d'abord, puis copie :
   ```bash
   rclone sync minioprod:company-private-files r2:company-private-files --dry-run --progress
   rclone sync minioprod:company-private-files r2:company-private-files --progress
   ```
4. Vérifier l'égalité :
   ```bash
   rclone check minioprod:company-private-files r2:company-private-files
   ```

**Vérification :**
- `rclone check` ne signale aucune différence.
- Le compteur « 总储存 » dans le dashboard R2 reflète le volume attendu.
- Les object keys sont **identiques** (rclone préserve les chemins) → aucune migration DB nécessaire.

**Anti-patterns :**
- ❌ Ne pas renommer/réorganiser les objets pendant la copie (casserait les `object_key` stockés en base).
- ❌ Ne pas supprimer le MinIO source tant que la Phase 4 n'est pas validée (rollback possible).

---

## Phase 4 — Bascule de l'environnement de prod

**À faire :**
1. Mettre à jour le `.env` du backend de prod :
   ```env
   MINIO_ENDPOINT=585bc0359f11466b43d1b8c4245e871b.r2.cloudflarestorage.com
   MINIO_PORT=443
   MINIO_USE_SSL=true
   MINIO_REGION=auto
   MINIO_ACCESS_KEY=<R2_ACCESS_KEY_ID>
   MINIO_SECRET_KEY=<R2_SECRET_ACCESS_KEY>
   MINIO_BUCKET=company-private-files
   ```
   > `MINIO_ENDPOINT` = host **sans** `https://` (le SDK minio ajoute le protocole via `useSSL`).
2. Ajouter `MINIO_REGION` à `apps/backend/.env.example` (doc) avec une valeur d'exemple commentée pour R2.
3. Redémarrer le backend (PM2, cf. CI/CD).

**Vérification (smoke test bout-en-bout) :**
- `GET http://<prod>/api/health` → OK.
- Upload via l'UID (training ou pièce jointe) → l'objet apparaît dans le bucket R2.
- Lecture d'un fichier existant migré : `GET /api/media/file?objectKey=<clé existante>` renvoie 200 et le bon `Content-Type`.
- **Seek vidéo** : requête `Range: bytes=...` → réponse **206** avec `Content-Range` correct (valide `getPartialObject`).
- Lecture vidéo training côté mobile + web (lecture réelle dans l'app).
- Suppression d'un fichier de test → disparaît du bucket R2.

**Anti-patterns :**
- ❌ Ne pas laisser `MINIO_USE_SSL=false` ou `MINIO_PORT=9000` (R2 = 443/TLS obligatoire).
- ❌ Ne pas mettre `https://` dans `MINIO_ENDPOINT`.

---

## Phase 5 — Vérification finale & nettoyage

1. **Confirmer la conformité doc** : la config minio↔R2 correspond aux paramètres Cloudflare (endpoint `<account>.r2.cloudflarestorage.com`, region `auto`, 443/TLS).
2. **Grep anti-patterns** :
   ```bash
   grep -rn "useSSL=false\|MINIO_PORT=9000" <prod .env>   # ne doit rien renvoyer en prod
   grep -rn "https://.*r2.cloudflarestorage" apps/backend/.env.example  # endpoint sans protocole côté MINIO_ENDPOINT
   ```
3. **Tests** :
   - `pnpm --filter backend typecheck`
   - `pnpm --filter backend exec jest src/minio src/media`
4. **docker-compose** : décider si on garde le service `minio` local pour le dev (recommandé — le dev reste sur MinIO local, seule la prod passe sur R2). Aucun changement de code requis grâce aux env vars.
5. **Rollback** : conservé tant que la prod n'est pas validée → MinIO source intact ; revenir = restaurer l'ancien `.env`.
6. Une fois validé plusieurs jours : décommissionner le conteneur MinIO de prod + son volume `zhao_minio_data`.

---

## Récap des fichiers touchés (code)

| Fichier | Changement |
|---|---|
| `apps/backend/src/minio/minio.service.ts` | + option `region` au constructeur ; (opt.) region de config dans `makeBucket` |
| `apps/backend/src/minio/minio.service.spec.ts` | ajuster le mock du constructeur si nécessaire |
| `apps/backend/.env.example` | + `MINIO_REGION`, note R2 |
| `.env` de prod (hors repo) | repointage complet vers R2 |

Aucun changement de schéma Prisma, aucune migration DB, aucun changement web/mobile.
