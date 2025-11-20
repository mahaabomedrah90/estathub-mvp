#!/usr/bin/env bash
set -e

echo "🔐 Getting admin token..."
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estathub.local","password":"admin123"}' \
  | jq -r '.token')

echo "✅ Got token"
echo ""
echo "🪙 Minting 10 tokens for property 1 to user 4..."

RESPONSE=$(curl -s -X POST http://localhost:5001/api/tokens/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "propertyId": 1,
    "userId": 4,
    "tokens": 10
  }')

echo "Response: $RESPONSE"
echo ""

BLOCKCHAIN_TX_ID=$(echo "$RESPONSE" | jq -r '.blockchainTxId // empty')

if [ -n "$BLOCKCHAIN_TX_ID" ]; then
  echo "✅ SUCCESS! Blockchain transaction created!"
  echo "📝 Transaction ID: $BLOCKCHAIN_TX_ID"
  echo ""
  echo "🌐 View in browser: http://localhost:5173/blockchain"
else
  echo "⚠️  No blockchain transaction ID. Check backend logs."
fi

# 1. Check Docker containers (optional)
docker ps | grep dev-peer

# 2. Create a property (this will initialize it on the blockchain)
curl -X POST http://localhost:5001/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Property",
    "totalValue": 1000000,
    "tokenPrice": 100,
    "totalTokens": 10000
  }'

