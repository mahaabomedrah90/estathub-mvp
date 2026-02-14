# Estathub Fabric Gateway Service

This service is a standalone HTTP gateway that connects to the Hyperledger Fabric network using the Fabric Gateway SDK and exposes a minimal internal API for the Estathub backend.

## Why this exists

- Decouples Fabric connectivity from the main backend.
- Provides a stateless, container-portable service suitable for AWS ECS Fargate or EC2.
- Enforces an internal API key (`X-GATEWAY-KEY`) between backend and gateway.

## Architecture

- Node.js + TypeScript + Express
- Uses `@hyperledger/fabric-gateway` and `@grpc/grpc-js` only.
- Maintains a shared Fabric `Gateway` connection and contract cache.

## HTTP API

Base URL is environment-specific, e.g. `http://fabric-gateway.internal:4000`.

### GET /v1/health

- **Auth**: none
- **Response 200**:

```json
{
  "ok": true,
  "service": "fabric-gateway",
  "fabric": {
    "configured": true,
    "useFabric": true
  },
  "time": "2025-01-01T00:00:00.000Z"
}
```

### POST /v1/tx/submit

- **Auth**: requires header `X-GATEWAY-KEY: <secret>`
- **Body**:

```json
{
  "channel": "mychannel",
  "chaincode": "estathub",
  "contractName": "estathub",
  "functionName": "MintTokens",
  "args": ["propertyId", "userId", "tokens", "orderId"],
  "transientData": {
    "key": "base64-encoded-value"
  }
}
```

- **Response 200**:

```json
{
  "success": true,
  "txId": "...",
  "resultRaw": "",
  "result": null,
  "durationMs": 123,
  "functionName": "MintTokens"
}
```

### POST /v1/tx/evaluate

- **Auth**: requires header `X-GATEWAY-KEY: <secret>`
- **Body**:

```json
{
  "channel": "mychannel",
  "chaincode": "estathub",
  "contractName": "estathub",
  "functionName": "GetAllProperties",
  "args": []
}
```

- **Response 200**:

```json
{
  "success": true,
  "resultRaw": "...",
  "result": [],
  "durationMs": 45,
  "functionName": "GetAllProperties"
}
```

## Environment variables

See `.env.example` for the full list. Key variables:

- `PORT` (default 4000)
- `NODE_ENV`
- `LOG_LEVEL`
- `USE_FABRIC`
- `GATEWAY_API_KEY` (required in non-dev)
- `ALLOW_INSECURE_GATEWAY` (dev only)
- `FABRIC_CHANNEL`, `FABRIC_CHAINCODE`
- `FABRIC_PEER`, `FABRIC_MSP`, `FABRIC_USER_ID`
- `FABRIC_TLS_CERT`, `FABRIC_IDENTITY_CERT`, `FABRIC_PRIVATE_KEY`
- `FABRIC_CONNECTION_PROFILE`
- `FABRIC_TIMEOUT_MS`

## Running locally (Node)

```bash
cd gateway
npm install
cp .env.example .env.development
npm run dev
```

The service listens on `PORT` (default 4000).

## Running with Docker (local dev)

```bash
cd gateway
cp .env.example .env.development
docker compose -f docker-compose.dev.yml up --build
```

## Backend integration (later phase)

The backend should call this service instead of using the Fabric SDK directly:

- Configure:
  - `FABRIC_GATEWAY_URL` (e.g. `http://fabric-gateway:4000`)
  - `FABRIC_GATEWAY_KEY` (same value as `GATEWAY_API_KEY` here)
- Use HTTP client to call:
  - `POST /v1/tx/submit` for state-changing transactions.
  - `POST /v1/tx/evaluate` for read-only queries.

## Security notes

- In production, `GATEWAY_API_KEY` must be injected from AWS Secrets Manager or similar.
- `ALLOW_INSECURE_GATEWAY` should be `false` in production.
- Certificates and private keys should be provided via secure secrets/volumes when running in ECS/EC2.
