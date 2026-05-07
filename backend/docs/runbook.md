# RoyalDSA Backend Runbook

## Services
- API server: `npm run dev`
- Judge worker: `npm run worker`
- MongoDB + Redis must be available before starting app/worker.

## Environment setup
1. Copy `.env.example` to `.env`.
2. Fill secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) with long random values.
3. Set `MONGODB_URI`, `MONGODB_DB_NAME`, `REDIS_URL`.
4. Set `CORS_ORIGINS` for allowed frontend hosts.

## Deployment checklist
- Run `npm run build`, `npm test`, and `npm run lint`.
- Run seed on first deployment: `npm run seed`.
- Start API and worker as separate processes.
- Ensure Docker is installed and available to worker host for code execution.
- Enable container runtime restrictions (no network, low memory/cpu, timeout kill).

## Health and observability
- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Metrics: `GET /health/metrics`
- Monitor:
  - HTTP latency and error rate
  - submission queue depth and worker failures
  - judge success/fail/runtime error distribution

## Incident response basics
- If judge queue stalls:
  - verify Redis availability
  - verify worker process is alive
  - inspect worker logs for Docker execution failures
- If auth failures spike:
  - check `JWT_*_SECRET` consistency across deployments
  - verify system clock skew
  - review rate-limit logs for abuse patterns

## Assigned test module rollout
1. Deploy schema changes first (new collections are additive and backward-compatible).
2. Release read APIs:
   - `GET /api/v1/tests/groups`
   - `GET /api/v1/assigned-tests/assigned/me`
   - `GET /api/v1/notifications/me`
3. Release write APIs for admins:
   - `POST /api/v1/tests`
   - `POST /api/v1/tests/:testId/assign`
   - `POST /api/v1/tests/groups`
   - `POST /api/v1/tests/groups/:groupId/members`
4. Release user attempt APIs:
   - `POST /api/v1/assigned-tests/:assignmentId/start`
   - `PUT /api/v1/assigned-tests/session/:sessionId/problems/:problemId/code`
   - `POST /api/v1/assigned-tests/session/:sessionId/problems/:problemId/run`
   - `POST /api/v1/assigned-tests/session/:sessionId/submit`
5. Watch metrics for 24h before enabling at full traffic.

## Assigned test module metrics
- Request rate and p95 latency for `/assigned-tests/*` routes.
- Session lifecycle counters:
  - `not_started -> in_progress`
  - `in_progress -> submitted`
  - `in_progress -> auto_submitted/expired`
- Run outcome distribution:
  - accepted / failed / runtime_error / compile_error
- Storage growth:
  - `assignedtestrunevents` document growth per day
  - average testCaseResults payload size
- Notification delivery/read funnel:
  - created notifications
  - unread count over time
  - read-through rate in first 24h

## Assigned test consistency invariants
- `assigned_test_run_events` is append-only. Never update historical run rows; always insert next `runNo`.
- Session transition rules:
  - allowed: `not_started -> in_progress`
  - allowed: `in_progress -> submitted|auto_submitted|expired`
  - final states (`submitted`, `auto_submitted`, `expired`) are immutable for run/code-save endpoints.
- When a session reaches final state:
  - freeze each `problemStates[].finalCode` from `currentCode`
  - block further code edits and run attempts.
- For each run event:
  - snapshot `stdinSnapshot` and `expectedOutputSnapshot` so later testcase edits do not rewrite history.
  - enforce unique `(sessionId, problemId, runNo)`.

