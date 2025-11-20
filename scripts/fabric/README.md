# Estathub Fabric Dev Runbook (Local)

This guide uses Hyperledger Fabric samples `test-network` to run a local network, deploy the **Saudi Digital Deed chaincode** (`estathub`) on channel `estathub-channel`, and configure the backend to connect via the Fabric Gateway.

## Saudi Digital Deed Features

- ✅ Property lifecycle management (Register → Approve → Tokenize)
- ✅ Token minting and investor holdings
- ✅ Digital deed issuance (صك ملكية رقمي) with PDF hash verification
- ✅ Private Data Collection (PDC) for investor PII
- ✅ QR code verification
- ✅ Deed transfer and revocation

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

- `./up.sh` — Starts Fabric test network and creates `estathub-channel`.
- `./deploy_chaincode.sh` — Deploys Saudi Digital Deed chaincode `estathub` (TypeScript) with Private Data Collection to `estathub-channel`.
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

3. Deploy Saudi Digital Deed chaincode (TypeScript with PDC):
```bash
# Deploys from chaincode/estathub-ts with Private Data Collection
./deploy_chaincode.sh

# To upgrade chaincode (after changes):
CC_SEQUENCE=2 CC_VERSION=1.1 ./deploy_chaincode.sh
```

4. Import Org1 app user identity and copy connection profile into backend:
```bash
node enrollAppUser.js
```

5. Configure backend `.env`:
```bash
USE_FABRIC=true
FABRIC_CONNECTION_PROFILE=backend/fabric/connection-org1.json
FABRIC_CHANNEL=estathub-channel
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

- `deploy_chaincode.sh` deploys the Saudi Digital Deed chaincode from `chaincode/estathub-ts` with Private Data Collection (`deedPDC`) for storing sensitive investor data.
- `enrollAppUser.js` imports the existing `User1@org1.example.com` identity from the test network into `backend/fabric/wallet` as `appUser` and copies `connection-org1.json`.
- The chaincode includes composite keys for efficient querying of deeds by user and property.
- All blockchain events are emitted for off-chain listeners to process (e.g., PDF generation).

## Testing Chaincode

After deployment, you can test chaincode functions using peer CLI:

```bash
# Navigate to test-network
cd $FABRIC_SAMPLES/test-network

# Source environment variables
source scripts/envVar.sh && setGlobals 1

# Query a property
peer chaincode query -C estathub-channel -n estathub \
  -c '{"function":"GetProperty","Args":["PROP001"]}'

# Query investor deeds
peer chaincode query -C estathub-channel -n estathub \
  -c '{"function":"GetDeedsByUser","Args":["USER001"]}'
```
