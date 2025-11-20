#!/usr/bin/env bash
set -euo pipefail

: "${FABRIC_SAMPLES:=${HOME}/fabric-samples}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧹 Resetting Fabric Network..."
echo "   This will clean all peer state databases and restart the network"
echo ""

# Navigate to test-network
pushd "${FABRIC_SAMPLES}/test-network" >/dev/null

echo "📉 Step 1: Bringing down the network..."
./network.sh down

echo ""
echo "🗑️  Step 2: Cleaning peer state databases..."
echo "   Removing stateLeveldb data from both peers..."

# Clean peer0.org1 state database
if docker ps -a | grep -q peer0.org1.example.com; then
  echo "   Cleaning peer0.org1.example.com..."
  docker exec peer0.org1.example.com bash -c "rm -rf /var/hyperledger/production/ledgersData/stateLeveldb/*" 2>/dev/null || true
fi

# Clean peer0.org2 state database
if docker ps -a | grep -q peer0.org2.example.com; then
  echo "   Cleaning peer0.org2.example.com..."
  docker exec peer0.org2.example.com bash -c "rm -rf /var/hyperledger/production/ledgersData/stateLeveldb/*" 2>/dev/null || true
fi

echo "   ✅ State databases cleaned"

echo ""
echo "🚀 Step 3: Starting fresh network..."
./network.sh up createChannel -c estathub-channel -ca

if [ $? -ne 0 ]; then
  echo "❌ Failed to start network"
  popd >/dev/null
  exit 1
fi

popd >/dev/null

echo ""
echo "📦 Step 4: Deploying chaincode..."
cd "${SCRIPT_DIR}"

# Set environment variables for chaincode deployment
export OVERRIDE_ORG=""
export FABRIC_CFG_PATH="${FABRIC_SAMPLES}/config/"

./deploy_chaincode.sh

if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy chaincode"
  exit 1
fi

echo ""
echo "✅ Network reset complete!"
echo "   All peers have clean state databases"
echo "   Chaincode deployed with consistent definitions"
echo ""
echo "🔍 Verification:"
echo "   Run: docker ps | grep peer"
echo "   Check: curl http://localhost:5001/api/blockchain/properties"