# Multi-stage Dockerfile for Fabric Gateway service

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src
COPY fabric ./fabric

RUN npm ci
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/fabric ./fabric

EXPOSE 4000

CMD ["node", "dist/index.js"]
