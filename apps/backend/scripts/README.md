# Inactive account cleanup

Deploy `20261001120000_anonymous_user_history` first, then deploy the backend and both clients that accept anonymous authors. The production image contains the compiled cleanup command. Only after those steps, run this on the production host, from the configured deploy directory:

```sh
docker compose -f docker-compose.backend.yml run --rm --no-deps -T backend node dist/maintenance/purge-inactive-users.js
docker compose -f docker-compose.backend.yml run --rm --no-deps -T backend node dist/maintenance/purge-inactive-users.js --execute
```

The first command reports the count without changing data. The second permanently removes existing `removed` and `deleted` accounts using the same transaction as new account deletions. It stops on the first failure and can be rerun; successful accounts are no longer selected. Verify the remaining count is zero and spot-check preserved orders and other history before treating the cleanup as complete. Keep a database backup before execution because deleted accounts cannot be restored.
