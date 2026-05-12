# Infra overview

RoyalDSA uses **one** root Compose file, **`docker-compose.yml`**, for the app stack:

| Command | What runs |
|---------|-----------|
| `docker compose up --build -d` | **Redis**, **backend**, **worker**, **embedded Judge0** — no nginx/frontend containers (host the SPA yourself or use dev server). |
| `docker compose --profile web up --build -d` | Same as above **plus** **nginx** + **frontend** (single origin on port **80**; nginx proxies `/api/` and `/health` to the API). |

Judge0-only on a separate Linux machine: **`infra/judge0/docker-compose.yml`**.

---

## Judge0-only host (Server A)

1. `cd infra/judge0` and `cp judge0.conf.example judge0.conf` — set `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, optional `AUTHN_TOKEN`.
2. `docker compose up -d` — Judge0 on host port **2358** by default (`JUDGE0_PUBLISH_PORT`).
3. Firewall / TLS: restrict access to your RoyalDSA host; use TLS in production.
4. Smoke test: `curl -sS "http://JUDGE0_HOST:2358/system_info" | head` (add `-H "X-Auth-Token: …"` if auth is enabled).

---

## RoyalDSA host (Server B) with **remote** Judge0

1. On this repo’s host, set **`JUDGE0_BASE_URL`** (and **`JUDGE0_AUTH_TOKEN`** if Server A uses `AUTHN_TOKEN`) in `.env`.
2. **Remove embedded Judge0** from the same Compose project: in **`docker-compose.yml`**, delete or comment out the **`judge0-*`** services and the **`judge0-postgres-data`** volume, and remove **`judge0-api`** from **`depends_on`** on **`backend`** and **`worker`** (otherwise Compose waits for a service you no longer run).
3. Start: `docker compose up --build -d` or add **`--profile web`** if you want nginx + frontend on this host.

---

## Same host: nginx + UI + API + Judge0

From the repo root:

```bash
docker compose --profile web up --build -d
```

Set OAuth / CORS for **`http://localhost`** (or your domain) so **`GOOGLE_OAUTH_REDIRECT_URI`** matches **`http://<host>/api/v1/auth/oauth/google/callback`**. Default SPA build uses **`VITE_API_BASE_URL=/api/v1`**.

---

## Files reference

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Redis, API, worker, embedded Judge0; optional **`web`** profile → nginx + frontend |
| `infra/judge0/docker-compose.yml` | Judge0-only stack (Server A) |
| `infra/judge0/judge0.conf.example` | Copy to `judge0.conf` and edit secrets |
| `infra/nginx/app-default.conf` | nginx routes `/api/`, `/health`, `/` (used with **`--profile web`**) |
