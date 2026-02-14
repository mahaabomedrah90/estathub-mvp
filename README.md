# Estathub MVP – Starter Repo

This repository is a starter for building the MVP of **Estathub** using **GitHub + Plane + Cursor + VS Code**.

## Repo structure

```
estathub-mvp/
├── frontend/        # React app (Vite or CRA)
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/         # Node.js (Express) API
│   ├── src/
│   ├── routes/
│   ├── models/
│   └── package.json
├── blockchain/      # Hyperledger Fabric setup (later)
├── docs/            # Architecture, BRD, HLD, runbooks
├── scripts/         # Utility scripts
└── .github/workflows/ci.yml # GitHub Actions CI
```

## Branching strategy

- `main`: protected, production-ready.
- `dev`: integration branch for features.
- `feature/<ISSUE_KEY>-short-title`: per task branch (e.g., `feature/FE-01-investor-dashboard`).

## Commit convention

Reference the Plane issue key in commits:
```
git commit -m "FE-01: add investor dashboard layout"
```
On GitHub, mention issues/PRs with `Closes #<number>` when merging.

## Getting started

See `docs/setup_guide.md` for step-by-step instructions.

## Production deployment notes (AWS)

This repo supports deploying the frontend as a static SPA and the backend behind an ALB.

### Frontend (Vite SPA)

- Build output folder: `frontend/dist/`
- The frontend must be built with an API base that points to your production backend.
  - Recommended for same-domain CloudFront routing:
    - `VITE_API_BASE=https://www.alwsm.sa/api`

### Backend (Express API)

- CORS is allowlist-based and read from `CORS_ORIGIN` (comma-separated origins):
  - `CORS_ORIGIN="https://alwsm.sa,https://www.alwsm.sa"`
- In `NODE_ENV=production`, the backend will **fail fast** if `CORS_ORIGIN` is missing.

### CloudFront routing (critical)

- Ensure CloudFront routes:
  - `/*` -> S3 (SPA)
  - `/api/*` -> ALB (backend)

If `/api/*` is served by S3, the frontend will receive `index.html` (HTML) instead of JSON.

### CloudFront invalidation (after frontend upload)

```bash
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```
