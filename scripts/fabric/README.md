# Estathub Fabric Dev Runbook (Local)

This guide uses Hyperledger Fabric samples `test-network` to run a local network, deploy chaincode `estathub` on channel `mychannel`, and configure the backend to connect via the Fabric Gateway.

## Prerequisites

- Docker Desktop running
- Node.js LTS and npm
- Fabric samples and binaries installed
  - If not installed, follow: https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html
  - Default location assumed: `~/fabric-samples`

## Files created by these scripts

- `backend/fabric/connection-org1.json`
- `backend/fabric/wallet/` (contains `appUser` identity)

## Scripts

- `./up.sh` — Starts Fabric test network and creates `mychannel`.
- `./deploy_chaincode.sh` — Deploys chaincode `estathub` (TypeScript) to `mychannel`.
- `./enrollAppUser.js` — Imports Org1 user certs into a FileSystem wallet as `appUser` and copies connection profile.
- `./down.sh` — Stops and cleans the test network.

> Make scripts executable: `chmod +x *.sh`

## Usage

1. Export where your Fabric samples live (if not `~/fabric-samples`):
```bash
export FABRIC_SAMPLES=~/fabric-samples
```

2. Bring up the network and create a channel:
```bash
./up.sh
```

3. Deploy chaincode (TypeScript):
```bash
# Customize CC_PATH if your chaincode is elsewhere.
# By default this uses the Fabric samples asset-transfer-basic TypeScript as a placeholder with name `estathub`.
./deploy_chaincode.sh
```

4. Import Org1 app user identity and copy connection profile into backend:
```bash
node enrollAppUser.js
```

5. Configure backend `.env`:
```bash
USE_FABRIC=true
FABRIC_CONNECTION_PROFILE=backend/fabric/connection-org1.json
FABRIC_CHANNEL=mychannel
FABRIC_CONTRACT=estathub
FABRIC_WALLET_PATH=backend/fabric/wallet
FABRIC_IDENTITY=appUser
```

6. Run backend with Fabric enabled:
```bash
npm run start:ts
```

7. Tear down when done:
```bash
./down.sh
```

## Notes

- `deploy_chaincode.sh` uses `estathub` as the chaincode name and installs a TS chaincode. Replace `CC_PATH` to point to your custom chaincode once implemented.
- `enrollAppUser.js` imports the existing `User1@org1.example.com` identity from the test network into `backend/fabric/wallet` as `appUser` and copies `connection-org1.json`.
