#!/usr/bin/env bash
set -euo pipefail

: "${FABRIC_SAMPLES:=${HOME}/fabric-samples}"

pushd "${FABRIC_SAMPLES}/test-network" >/dev/null
./network.sh down || true
popd >/dev/null

echo "Fabric network has been torn down."
