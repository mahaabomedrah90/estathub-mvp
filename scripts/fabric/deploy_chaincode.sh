#!/usr/bin/env bash
set -euo pipefail

: "${FABRIC_SAMPLES:=${HOME}/fabric-samples}"
: "${CC_NAME:=estathub}"
: "${CC_LABEL:=${CC_NAME}_1}"
: "${CC_LANG:=typescript}"
# Default to repository chaincode path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."
DEFAULT_CC_PATH="${REPO_ROOT}/chaincode/estathub-ts"
: "${CC_PATH:=${DEFAULT_CC_PATH}}"
: "${CHANNEL:=mychannel}"

pushd "${FABRIC_SAMPLES}/test-network" >/dev/null
# Package and deploy
./network.sh deployCC -ccn "${CC_NAME}" -ccp "${CC_PATH}" -ccl "${CC_LANG}" -c "${CHANNEL}"
popd >/dev/null

echo "Chaincode '${CC_NAME}' deployed to channel '${CHANNEL}'."
