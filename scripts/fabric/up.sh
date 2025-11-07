#!/usr/bin/env bash
set -euo pipefail

: "${FABRIC_SAMPLES:=${HOME}/fabric-samples}"

pushd "${FABRIC_SAMPLES}/test-network" >/dev/null
./network.sh down || true
./network.sh up createChannel -c mychannel -ca
popd >/dev/null

echo "Fabric network is up on channel 'mychannel' using CA."
