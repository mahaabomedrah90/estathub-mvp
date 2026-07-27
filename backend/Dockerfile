# =========================
# Stage 1: Build
# =========================
FROM public.ecr.aws/docker/library/node:20-bullseye AS builder

RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Generate the Prisma client BEFORE tsc so type-checking sees the generated
# model types (deedNumber, Prisma.DbNull, inferred callback params, etc.).
RUN npx prisma generate
RUN npm run build

# =========================
# Stage 2: Production
# =========================
FROM public.ecr.aws/docker/library/node:20-bullseye-slim

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads

# ensure uploads paths are writable by appuser
# /app/uploads/properties is the runtime (CWD-relative) target for multer diskStorage
# and express.static('uploads') — must exist or diskStorage fails with ENOENT (400).
RUN mkdir -p /app/uploads/properties \
    && mkdir -p /app/dist/uploads/properties \
    && chown -R appuser:appuser /app/uploads /app/dist/uploads
    
USER appuser
EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

CMD ["node", "dist/src/index.js"]
