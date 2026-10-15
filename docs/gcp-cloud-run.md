# Cloud Run (combined image)

This repo is the React UI only. Production is **one** Cloud Run service built from **hotel-os-app**: Vite `dist` is copied into the Spring Boot JAR.

Pushing `main` here sends `repository_dispatch` (`frontend-changed`) to `hotel-os-app`, which rebuilds the image.

## GitHub (`hotel-os`)

| Secret | Purpose |
|--------|---------|
| `BACKEND_DISPATCH_TOKEN` | PAT that can dispatch workflows on `hotel-os-app` |

| Variable | Example |
|----------|---------|
| `BACKEND_REPO` | `your-user/hotel-os-app` (optional) |

GCP WIF secrets are **not** needed on this repo.

GCP setup, Cloud SQL, and the deploy workflow live in `hotel-os-app` (`docs/gcp-cloud-run.md`, `infra/gcp-setup.sh`).
