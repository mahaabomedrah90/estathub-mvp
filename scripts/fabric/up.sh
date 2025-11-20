#!/usr/bin/env bash
set -euo pipefail

: "${FABRIC_SAMPLES:=${HOME}/fabric-samples}"
: "${CHANNEL:=estathub-channel}"
: "${COMPOSE_PROJECT_NAME:=fabric}"

export COMPOSE_PROJECT_NAME

pushd "${FABRIC_SAMPLES}/test-network" >/dev/null
echo "🔽 Cleaning up any existing network..."
./network.sh down || true

echo "🚀 Starting Fabric network with channel '${CHANNEL}'..."
./network.sh up createChannel -c "${CHANNEL}" -ca
popd >/dev/null

echo "✅ Fabric network is up on channel '${CHANNEL}' using CA."
