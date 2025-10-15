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
