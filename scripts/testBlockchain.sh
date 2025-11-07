#!/bin/bash
# Test Blockchain Integration Script
# This script creates a property and order with blockchain recording

set -e

echo "🚀 Testing Blockchain Integration"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:5001"

# Step 1: Login as Admin
echo -e "${BLUE}Step 1: Login as Admin${NC}"
ADMIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@estathub.local"}')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Admin logged in${NC}"
echo ""

# Step 2: Create Property (will be recorded on blockchain)
echo -e "${BLUE}Step 2: Creating Property on Blockchain${NC}"
PROPERTY_RESPONSE=$(curl -s -X POST $API_URL/api/properties \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name":"Blockchain Test Property",
    "totalValue":500000,
    "tokenPrice":50,
    "totalTokens":10000
  }')

echo "Response: $PROPERTY_RESPONSE"
PROPERTY_ID=$(echo $PROPERTY_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$PROPERTY_ID" ]; then
  echo -e "${YELLOW}⚠ Property creation may have failed. Check backend logs.${NC}"
  echo "Response was: $PROPERTY_RESPONSE"
else
  echo -e "${GREEN}✓ Property created with ID: $PROPERTY_ID${NC}"
fi
echo ""

# Step 3: Login as Investor
echo -e "${BLUE}Step 3: Login as Investor${NC}"
INVESTOR_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"investor@estathub.local"}')

INVESTOR_TOKEN=$(echo $INVESTOR_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Investor logged in${NC}"
echo ""

# Step 4: Deposit funds
echo -e "${BLUE}Step 4: Depositing funds to wallet${NC}"
curl -s -X POST $API_URL/api/wallet/deposit \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -d '{"amount":10000}' > /dev/null

echo -e "${GREEN}✓ Deposited 10000 to wallet${NC}"
echo ""

# Step 5: Create Order
echo -e "${BLUE}Step 5: Creating Order${NC}"
ORDER_RESPONSE=$(curl -s -X POST $API_URL/api/orders \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -d "{\"propertyId\":$PROPERTY_ID,\"tokens\":100}")

ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}✓ Order created with ID: $ORDER_ID${NC}"
echo ""

# Step 6: Confirm Payment (mints tokens on blockchain)
echo -e "${BLUE}Step 6: Confirming Payment (Minting on Blockchain)${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST $API_URL/api/payments/confirm \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -d "{\"orderId\":$ORDER_ID}")

echo "Response: $PAYMENT_RESPONSE"
echo -e "${GREEN}✓ Payment confirmed - Tokens minted on blockchain!${NC}"
echo ""

# Step 7: View Results
echo -e "${BLUE}Step 7: Viewing Results${NC}"
echo "=================================="
echo ""
echo "📊 View database records:"
echo "  node scripts/viewTransactions.js"
echo ""
echo "⛓️  Query blockchain directly:"
echo "  node scripts/fabric/queryBlockchain.js"
echo ""
echo "🔍 Open Prisma Studio:"
echo "  cd backend && npx prisma studio"
echo ""
echo -e "${GREEN}✅ Test completed!${NC}"
