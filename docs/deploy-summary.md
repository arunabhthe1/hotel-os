# Hotel OS — deploy summary

This repo is the **React UI only**. Production is one Cloud Run service built from **hotel-os-app** (Vite `dist` copied into the Spring Boot JAR).

The full write-up (what changed, Compose DB creds, GCP, and GitHub) is in the sibling repo: `hotel-os-app/docs/deploy-summary.md`.

## This repo — required GitHub steps

| Name | Type | Purpose |
|------|------|---------|
| `BACKEND_DISPATCH_TOKEN` | Secret | PAT that can `repository_dispatch` `hotel-os-app` |
| `BACKEND_REPO` | Variable (optional) | `your-user/hotel-os-app` |

Pushing **`main`** here does not build an image. It tells **hotel-os-app** to rebuild the combined image.

Merge `feature/deploy` → `main` before that works (workflow trigger is `main` only).

Local UI still: `npm install && npm start` (API on `http://localhost:8080`). Combined UI+API+Postgres: `docker compose up --build` from **hotel-os-app**.
