#!/usr/bin/env bash
set -euo pipefail

: "${FABRIC_SAMPLES:=${HOME}/fabric-samples}"
: "${CC_NAME:=estathub}"
: "${CC_VERSION:=1.0}"
: "${CC_SEQUENCE:=}"
: "${CC_LANG:=typescript}"
: "${UPGRADE:=true}"
: "${COMPOSE_PROJECT_NAME:=fabric}"

export COMPOSE_PROJECT_NAME

# Default to repository chaincode path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."
DEFAULT_CC_PATH="${REPO_ROOT}/chaincode/estathub-ts"
: "${CC_PATH:=${DEFAULT_CC_PATH}}"
: "${CHANNEL:=estathub-channel}"

# Private Data Collection config path
COLLECTIONS_CONFIG="${CC_PATH}/collections_config.json"

# OR endorsement policy (more flexible than AND)
SIGNATURE_POLICY="OR('Org1MSP.member','Org2MSP.member')"

echo "📦 Deploying chaincode '${CC_NAME}' v${CC_VERSION}..."
echo "   Path: ${CC_PATH}"
echo "   Channel: ${CHANNEL}"
echo "   Language: ${CC_LANG}"
echo "   Collections Config: ${COLLECTIONS_CONFIG}"
echo "   Signature Policy: ${SIGNATURE_POLICY}"

# Verify collections config exists
if [ ! -f "${COLLECTIONS_CONFIG}" ]; then
  echo "❌ Error: Collections config not found at ${COLLECTIONS_CONFIG}"
  exit 1
fi

pushd "${FABRIC_SAMPLES}/test-network" >/dev/null

# Auto-detect sequence number if upgrade flag is set and CC_SEQUENCE not manually provided
if [ "${UPGRADE}" = "true" ] && [ -z "${CC_SEQUENCE}" ]; then
  echo "🔍 Auto-detecting chaincode sequence for upgrade..."
  
  # Set required environment variables
  export OVERRIDE_ORG=""
  export FABRIC_CFG_PATH="${FABRIC_SAMPLES}/config/"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE="${FABRIC_SAMPLES}/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
  export CORE_PEER_MSPCONFIGPATH="${FABRIC_SAMPLES}/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
  export CORE_PEER_ADDRESS=localhost:7051
  
  # Query committed chaincode (macOS compatible)
  # Output format: "Version: 1.0, Sequence: 1, Endorsement Plugin..."
  QUERY_OUTPUT=$(peer lifecycle chaincode querycommitted \
    --channelID "${CHANNEL}" \
    --name "${CC_NAME}" 2>/dev/null || echo "")
  
  if [ -n "${QUERY_OUTPUT}" ]; then
    # Extract sequence number using sed (more reliable on macOS)
    CURRENT_SEQ=$(echo "${QUERY_OUTPUT}" | sed -n 's/.*Sequence: \([0-9]*\).*/\1/p' | head -1)
    CURRENT_SEQ=${CURRENT_SEQ:-0}
  else
    CURRENT_SEQ=0
  fi
  
  CC_SEQUENCE=$((CURRENT_SEQ + 1))
  echo "   Current sequence: ${CURRENT_SEQ}"
  echo "   New sequence: ${CC_SEQUENCE}"
elif [ -n "${CC_SEQUENCE}" ]; then
  # Manual sequence provided
  echo "   Using manually specified sequence: ${CC_SEQUENCE}"
else
  # Not upgrading - use default sequence 1
  : "${CC_SEQUENCE:=1}"
  echo "   Using default sequence: ${CC_SEQUENCE}"
fi

# Package and deploy with Private Data Collection and OR policy
echo "🚀 Deploying with OR endorsement policy..."
./network.sh deployCC \
  -ccn "${CC_NAME}" \
  -ccp "${CC_PATH}" \
  -ccl "${CC_LANG}" \
  -c "${CHANNEL}" \
  -ccv "${CC_VERSION}" \
  -ccs "${CC_SEQUENCE}" \
  -cccg "${COLLECTIONS_CONFIG}" \
  -ccep "${SIGNATURE_POLICY}"

popd >/dev/null

echo "✅ Chaincode '${CC_NAME}' v${CC_VERSION} deployed to channel '${CHANNEL}' with PDC."
echo "   Sequence: ${CC_SEQUENCE}"
echo "   Policy: ${SIGNATURE_POLICY}"
