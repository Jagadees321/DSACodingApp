# Deploying RoyalDSA (Docker Compose)

## Is it “fully production ready”?

Not automatically. The codebase includes production-minded defaults (Helmet, CORS, env validation, structured logging, metrics hooks), but **going live** still requires you to supply strong secrets, TLS, backups, monitoring, and a host where **Judge0 can run** (see below). Treat this stack as a **starting point** you harden for your environment.

## Judge0 host requirement

Self-hosted Judge0 uses **isolate** and **cgroups** inside privileged containers. That works reliably on **Linux**. **Docker Desktop on macOS** commonly fails with cgroup / sandbox errors; use a **Linux VM or server**, or point the backend at **Judge0 CE on the public cloud** instead of local Judge0.

## Split deployment (Judge0 on another host)

Run Judge0 with **`infra/judge0/docker-compose.yml`** on a **Linux** host. On the RoyalDSA host, use the **root `docker-compose.yml`** with **`JUDGE0_BASE_URL`** (and **`JUDGE0_AUTH_TOKEN`** if you set `AUTHN_TOKEN` in `judge0.conf`) pointing at that Judge0 URL.

If you do **not** want embedded Judge0 in the same Compose project, remove or comment out the **`judge0-*`** services (and the **`judge0-postgres-data`** volume), and remove **`judge0-api`** from **`depends_on`** on **`backend`** and **`worker`**, then set **`JUDGE0_BASE_URL`** to the remote URL. See **[infra/README.md](infra/README.md)** for firewall and smoke-test notes.

## Docker Compose: one file, two modes

The root **`docker-compose.yml`** always includes **Redis (BullMQ)**, **backend**, **worker**, and **embedded Judge0** (Postgres, Redis, API, Judge0 worker). **MongoDB is Atlas** — set **`MONGODB_URI`** in `.env`.

### Mode A — API + Judge0 only (frontend outside Docker)

Default — no Compose profile:

```bash
docker compose up --build -d
```

Host the SPA yourself (see **Manual frontend deployment** below) or run it with `npm run dev` against the API.

### Mode B — nginx + frontend + API + Judge0 (single origin on port 80)

Enable the **`web`** profile (starts **`nginx`** and **`frontend`** in addition to everything else):

```bash
docker compose --profile web up --build -d
```

Set **`CORS_ORIGINS`**, **`FRONTEND_OAUTH_SUCCESS_URL`**, and **`GOOGLE_OAUTH_REDIRECT_URI`** for **`http://localhost`** (or your public host) so OAuth matches nginx on port **80** (e.g. `GOOGLE_OAUTH_REDIRECT_URI=http://localhost/api/v1/auth/oauth/google/callback`). The SPA is built with **`VITE_API_BASE_URL=/api/v1`** by default so the browser hits nginx, which proxies to the API (see **`infra/nginx/app-default.conf`**).

From the repository root:

1. **Judge0 config (secrets):** the repo ships `infra/judge0/judge0.conf.example` only. Copy it and set passwords **before** first `docker compose up` (the real `judge0.conf` is gitignored and must not be committed):
   ```bash
   cp infra/judge0/judge0.conf.example infra/judge0/judge0.conf
   ```
   Edit `infra/judge0/judge0.conf` — set `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, and optionally `AUTHN_TOKEN`. If you set `AUTHN_TOKEN`, set the same value in your root `.env` as `JUDGE0_AUTH_TOKEN` for the API and worker services (via Compose substitution).

2. **MongoDB Atlas:** copy `.env.example` to `.env` and set **`MONGODB_URI`** to your Atlas connection string (typically `mongodb+srv://...`). In the Atlas UI, allow inbound connections from wherever Compose runs (**Network Access** → add your server IP, or `0.0.0.0/0` only if you accept the risk). Optionally set `MONGODB_DB_NAME` if it must differ from the name in the URI / app default (`royaldsa`).

3. **Secrets and URLs:** set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (each ≥ 16 characters). Set `CORS_ORIGINS`, `FRONTEND_OAUTH_SUCCESS_URL`, and OAuth callback URLs to match **where your frontend will be served** (see “Manual frontend deployment” below). With **`--profile web`**, include **`http://localhost`** (or your site origin) in **`CORS_ORIGINS`**.

4. **Build and start** (pick one):

   ```bash
   # API + worker + Redis + Judge0 — frontend hosted separately
   docker compose up --build -d
   ```

   ```bash
   # Same stack + nginx + frontend container (browser → port 80)
   docker compose --profile web up --build -d
   ```

5. **URLs (defaults):**

   - Backend API: `http://localhost:3002` (or your published host/port).
   - With **`--profile web`**: site at `http://localhost` (override **`HTTP_PUBLISH_PORT`** if needed).
   - Judge0 (optional external access / debugging): `http://localhost:2358`

6. **Seed data (optional):**

   ```bash
   docker compose exec backend node dist/scripts/seed.js
   ```

7. **Logs:**

   ```bash
   docker compose logs -f backend worker judge0-api judge0-worker
   ```

   With the **`web`** profile, add **`nginx`** and **`frontend`** to the log command if needed.

## Manual frontend deployment

If you are **not** using **`docker compose --profile web`**, the app still lives under **`frontend`**. Build it with the **public, browser-visible** API base URL (same origin scheme/host as users will use), then deploy the output to static hosting or your web server.

If you **are** using **`--profile web`**, the frontend image is built by Compose; you can still override **`VITE_API_BASE_URL`** at build time via Compose build args / `.env` if required.

1. Set build-time env (examples):
   - `VITE_USE_API=true`
   - `VITE_API_BASE_URL=https://api.example.com/api/v1` (must match your deployed backend path)

2. Build (from repo root):

   ```bash
   cd frontend
   npm ci
   VITE_USE_API=true VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build
   ```

3. Serve the production assets from `frontend`’s build output (exact folder depends on the framework’s build config — often `dist/` or `.output/`).

4. **Backend alignment:** in the server `.env` used by Compose (or your orchestrator), set:
   - `CORS_ORIGINS` to your frontend origin(s), e.g. `https://app.example.com`
   - `FRONTEND_OAUTH_SUCCESS_URL` to your OAuth return page, e.g. `https://app.example.com/oauth/callback`
   - `GOOGLE_OAUTH_REDIRECT_URI` to the backend callback URL Google expects, e.g. `https://api.example.com/api/v1/auth/oauth/google/callback`

## Compose environment (repo-root `.env`)

Docker Compose substitutes `${VAR:-default}` from your shell or a `.env` file next to `docker-compose.yml`.

| Variable | Default | Purpose |
|----------|---------|---------|
| **Ports** | | |
| `JUDGE0_PUBLISH_PORT` | 2358 | Host → Judge0 container 2358 |
| `BACKEND_PUBLISH_PORT` | falls back to `BACKEND_PORT` | Host port for the API (set explicitly when it must differ from the container port) |
| `BACKEND_PORT` | 3002 | Port the API listens on **inside** the container |
| **Backend / worker** | | |
| `NODE_ENV` | `production` | Node environment |
| `MONGODB_URI` | *(required in `.env`)* | MongoDB Atlas connection string (`mongodb+srv://…`) |
| `MONGODB_DB_NAME` | `royaldsa` | Logical DB name (app default; set in env if needed) |
| `REDIS_URL` | `redis://redis-app:6379` | BullMQ Redis |
| `JUDGE0_BASE_URL` | `http://judge0-api:2358` | Judge0 from API/worker (use external URL if Judge0 is not in this stack) |
| **Judge0 stack** | | |
| `JUDGE0_IMAGE` | `judge0/judge0:latest` | Judge0 API + worker image |
| `JUDGE0_INTERNAL_REDIS_HOST` | `judge0-redis` | Overrides `REDIS_HOST` for Judge0 services |
| `JUDGE0_INTERNAL_DB_HOST` | `judge0-db` | Overrides `POSTGRES_HOST` for Judge0 services |
| `JUDGE0_REDIS_IMAGE` | `redis:7.2-alpine` | Judge0 Redis image |
| `JUDGE0_POSTGRES_IMAGE` | `postgres:16.2-alpine` | Judge0 Postgres image |
| **Other images** | | |
| `REDIS_APP_IMAGE` | `redis:7-alpine` | BullMQ Redis image |
| **With `--profile web`** | | |
| `HTTP_PUBLISH_PORT` | `80` | Host → nginx → frontend + `/api` |
| `NGINX_IMAGE` | `nginx:1.27-alpine` | Reverse proxy image |
| `VITE_API_BASE_URL` | `/api/v1` | Browser API path (relative to nginx) |

If you change `BACKEND_PUBLISH_PORT` or `BACKEND_PORT`, update `GOOGLE_OAUTH_REDIRECT_URI` (and any hardcoded localhost URLs) accordingly.

## Troubleshooting

### `Bind for 0.0.0.0:2358 failed: port is already allocated`

Something else is already listening on **host** port **2358** (often a separate Judge0 stack, e.g. `infra/judge0/docker-compose.yml`, or an old container).

1. See what holds the port:
   ```bash
   docker ps --filter "publish=2358"
   ```
   Stop that container, or from `infra/judge0` run `docker compose down` if you started Judge0 there.

2. **Or** keep your other service on 2358 and publish this stack’s Judge0 on another host port (backend still talks to `judge0-api:2358` **inside** the Compose network — no backend change):
   ```bash
   JUDGE0_PUBLISH_PORT=2359 docker compose up -d
   ```
   Then open Judge0 at `http://localhost:2359` instead of 2358.

### Apple Silicon (`linux/amd64` vs `linux/arm64`)

The Judge0 image is **amd64**. On M1/M2/M3 Macs, Docker uses **emulation**; you may see a platform warning. That is expected. Execution will be slower than on native Linux.

## Production checklist (short)

- Replace all default JWT secrets and database passwords.
- Put **HTTPS** in front (reverse proxy: Caddy, nginx, Traefik, cloud LB).
- Restrict `CORS_ORIGINS` to your real web origin(s).
- Use Atlas backup/snapshot policies for app data; persist Judge0 volume (`judge0-postgres-data`) or externalize Judge0 DB as you prefer.
- Run Judge0 on **Linux** with adequate CPU/memory; tune limits in `judge0.conf`.
- Add uptime/error monitoring; scrape Prometheus metrics if you expose them.

## Services in `docker-compose.yml`

| Service | Role |
|---------|------|
| `redis-app` | BullMQ for RoyalDSA job queue |
| `backend` | REST API |
| `worker` | `judge.worker.js` — pulls jobs and calls Judge0 |
| `judge0-redis`, `judge0-db`, `judge0-api`, `judge0-worker` | Judge0 CE stack |
| `frontend` | TanStack app (**`--profile web`** only) |
| `nginx` | Edge proxy for `/`, `/api/`, `/health` (**`--profile web`** only) |

RoyalDSA’s worker is separate from Judge0’s worker: **both** are started by this Compose file.
