# Estathub Backend (Express + TypeScript)

## Overview

This service is the Estathub REST API built with Express and TypeScript. It is designed to run:

- In local development (Node + tsx + docker-compose.dev)
- As a stateless Docker container
- On AWS ECS Fargate using environment variables and external services (Postgres, Fabric, S3 in future)

---

## Development Workflow

### Prerequisites

- Node.js >= 18 (recommended 20)
- Docker (for local DB and optional container testing)

### Install dependencies

```bash
cd backend
npm install
```

### Run in development mode

```bash
npm run dev:ts
```

This uses `tsx` to watch `src/index.ts` and reload on changes. Environment is loaded from `.env.development`.

---

## Build Process (TypeScript → dist)

TypeScript is compiled into `dist/` via:

```bash
npm run build
```

The build step:

1. Uses `tsc -p .` to compile `src/**/*.ts` into `dist/**/*.js`.
2. Expects Prisma client to be generated (either locally or in the Docker build step).

---

## Production Docker Image

The backend is packaged as a **stateless** multi-stage Docker image using `node:20-alpine`.

### Dockerfile (summary)

- **Builder stage**
  - Base image: `node:20-alpine`
  - `npm ci` (installs all deps including dev deps)
  - Copies `tsconfig.json`, `prisma/`, `src/`, and `fabric/`
  - Runs `npx prisma generate`
  - Runs `npm run build` → outputs `dist/`

- **Runtime stage**
  - Base image: `node:20-alpine`
  - `npm ci --omit=dev` (production deps only)
  - Copies `dist/` and `prisma/`
  - Copies generated Prisma client from builder (`node_modules/.prisma` and `@prisma`)
  - Copies `fabric/` to `/app/fabric`
  - `ENV PORT=5001` (overridable)
  - `EXPOSE 5001`
  - `CMD ["node", "dist/index.js"]`

The container relies **only on environment variables** and external services (Postgres, Fabric). It does not require any host volumes in production.

### Build & Run (local container test)

```bash
cd backend

# Build image
docker build -t estathub-backend .

# Run container (example Postgres URL)
docker run --rm \
  -p 5001:5001 \
  -e PORT=5001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://postgres:postgres@db-host:5432/estathub?schema=public" \
  -e JWT_SECRET="change-me" \
  estathub-backend
```

In production (ECS), all env vars should be provided via **ECS task definitions + AWS Secrets Manager/SSM**, not `.env` files.

---

## docker-compose.dev.yml (DEV ONLY)

`docker-compose.dev.yml` is provided for **local development only**. It is **not** for production use.

Key characteristics:

- Runs `backend` service using `node:20-alpine` and `npm run dev:ts`.
- Binds the local project directory into `/app` so code changes are live.
- Loads environment from `.env.development`.
- Starts a local Postgres 15 instance on host port `5433`.

Example usage:

```bash
cd backend
docker compose -f docker-compose.dev.yml up
```

Then open the frontend (from project root):

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## Fabric Integration in Containers

The backend uses the **Fabric Gateway SDK** (`@hyperledger/fabric-gateway`).

At runtime, it expects the following **inside the container**:

- `/app/fabric/connection-org1.json`
- `/app/fabric/certs/peer.pem`
- `/app/fabric/certs/user.pem`
- `/app/fabric/certs/user.key`

These are referenced ONLY via environment variables:

- `FABRIC_TLS_CERT` (defaults to `/app/fabric/certs/peer.pem`)
- `FABRIC_IDENTITY_CERT` (defaults to `/app/fabric/certs/user.pem`)
- `FABRIC_PRIVATE_KEY` (defaults to `/app/fabric/certs/user.key`)
- `FABRIC_PEER`, `FABRIC_CHANNEL`, `FABRIC_CHAINCODE`, `FABRIC_MSP`, `FABRIC_USER_ID`

`fabric.ts` validates that the cert files exist when `USE_FABRIC=true` and will **fail fast** with clear errors if they are missing.

In production on ECS, these files should be provided via:

- A secure image build step (baking certs into a private image), **or**
- ECS task definition + secrets volume / sidecar that writes them into `/app/fabric/certs`.

---

## Statelessness & File Uploads

The backend is designed to be stateless:

- No user/session state is stored in memory between requests.
- All persistent data is stored in Postgres (and later, S3 for files).

Current behavior for property image uploads:

- Uses `multer` to save images under `uploads/properties/`.
- This directory is **ephemeral** inside the container.
- In a multi-task ECS setup, different tasks will not share these files.

> **Important:** For true production readiness, image storage should be migrated to **Amazon S3** (or similar). The current local uploads are suitable for **development and early staging only**.

When running in ECS, you should either:

- Accept that uploaded images are temporary (for demo environments), or
- Replace the upload implementation with S3 before going to production.

---

## Required Environment Variables

At minimum, the backend requires the following env vars at startup:

- `PORT` – API port (default 5001)
- `NODE_ENV` – `development` or `production`
- `DATABASE_URL` – Postgres connection string (with schema if using Prisma schemas)
- `JWT_SECRET` – strong random secret
- `JWT_EXPIRES_IN` – e.g. `1d`
- `CORS_ORIGIN` – allowed frontend origin

For Fabric (when enabled with `USE_FABRIC=true`):

- `USE_FABRIC` – `true` to enable Fabric integration
- `FABRIC_CHANNEL`
- `FABRIC_CHAINCODE`
- `FABRIC_PEER`
- `FABRIC_MSP`
- `FABRIC_USER_ID`
- `FABRIC_TLS_CERT`
- `FABRIC_IDENTITY_CERT`
- `FABRIC_PRIVATE_KEY`
- `FABRIC_DEBUG` (optional)

---

## Running on AWS ECS Fargate (Conceptual)

This backend is ready to run on ECS Fargate as a stateless service:

- Build and push the Docker image to ECR.
- Create a Fargate task definition using this image.
- Configure **environment variables** and **secrets** via ECS task definition + AWS Secrets Manager/SSM.
- Point the task at a managed Postgres database (e.g., Amazon RDS or Aurora).
- (Optional) Provide Fabric certs and connection profile via a secure mechanism (baked image or sidecar/volume) into `/app/fabric`.

No local volumes or host-specific paths are required for the container to start and serve traffic.
