# RoyalDSA Backend

Production-oriented Express + MongoDB backend for the DSA platform.

## Features
- Versioned REST API under `/api/v1`
- JWT access + rotating refresh sessions
- Mongo collections for users, problems, fundamentals, progress, submissions
- BullMQ queue and dedicated judge worker
- Docker-isolated Java/Python code execution
- Health checks and Prometheus metrics

## Quick start
1. `cp .env.example .env`
2. `npm install`
3. `npm run seed`
4. `npm run dev` (API)
5. `npm run worker` (judge worker)

## Frontend integration
In `frontend`, set:
- `VITE_USE_API=true`
- `VITE_API_BASE_URL=http://localhost:8080/api/v1`
- `VITE_API_TOKEN=<access-token>`

