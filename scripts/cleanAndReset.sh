#!/bin/bash
# Clean and Reset Database & Blockchain Script
# This script completely resets the database and blockchain to a fresh state

set -e

echo "🧹 Starting Clean and Reset Process"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Step 1: Stop backend if running
echo -e "${BLUE}Step 1: Checking for running backend...${NC}"
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠ Backend is running on port 5001. Please stop it first.${NC}"
    echo "Press Ctrl+C to cancel, or Enter to continue anyway..."
    read
else
    echo -e "${GREEN}✓ No backend running${NC}"
fi
echo ""

# Step 2: Tear down Fabric network
echo -e "${BLUE}Step 2: Tearing down Fabric network...${NC}"
if [ -d "${HOME}/fabric-samples/test-network" ]; then
    cd "${HOME}/fabric-samples/test-network"
    ./network.sh down 2>/dev/null || true
    echo -e "${GREEN}✓ Fabric network stopped${NC}"
else
    echo -e "${YELLOW}⚠ Fabric samples not found at ${HOME}/fabric-samples${NC}"
fi
cd "$PROJECT_ROOT"
echo ""

# Step 3: Clean Fabric wallet and connection profile
echo -e "${BLUE}Step 3: Cleaning Fabric wallet and connection profile...${NC}"
if [ -d "$PROJECT_ROOT/backend/fabric/wallet" ]; then
    rm -rf "$PROJECT_ROOT/backend/fabric/wallet"
    echo -e "${GREEN}✓ Removed Fabric wallet${NC}"
fi
if [ -f "$PROJECT_ROOT/backend/fabric/connection-org1.json" ]; then
    rm -f "$PROJECT_ROOT/backend/fabric/connection-org1.json"
    echo -e "${GREEN}✓ Removed connection profile${NC}"
fi
echo ""

# Step 4: Reset database
echo -e "${BLUE}Step 4: Resetting database...${NC}"
cd "$PROJECT_ROOT/backend"

# Backup old database (optional)
if [ -f "prisma/dev.db" ]; then
    BACKUP_NAME="dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp "prisma/dev.db" "prisma/$BACKUP_NAME"
    echo -e "${GREEN}✓ Backed up database to prisma/$BACKUP_NAME${NC}"
fi

# Delete database
rm -f prisma/dev.db prisma/dev.db-journal
echo -e "${GREEN}✓ Deleted database${NC}"

# Run migrations
echo -e "${BLUE}Running Prisma migrations...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✓ Database schema recreated${NC}"
echo ""

# Step 5: Seed fresh data
echo -e "${BLUE}Step 5: Seeding fresh demo data...${NC}"
node prisma/seed.js
echo -e "${GREEN}✓ Database seeded with demo users and properties${NC}"
echo ""

# Step 6: Restart Fabric network
echo -e "${BLUE}Step 6: Restarting Fabric network...${NC}"
cd "$PROJECT_ROOT/scripts/fabric"
./up.sh
echo -e "${GREEN}✓ Fabric network started${NC}"
echo ""

# Step 7: Deploy chaincode
echo -e "${BLUE}Step 7: Deploying chaincode...${NC}"
./deploy_chaincode.sh
echo -e "${GREEN}✓ Chaincode deployed${NC}"
echo ""

# Step 8: Enroll app user
echo -e "${BLUE}Step 8: Enrolling application user...${NC}"
node enrollAppUser.js
echo -e "${GREEN}✓ Application user enrolled${NC}"
echo ""

# Summary
echo ""
echo -e "${GREEN}✅ Clean and Reset Complete!${NC}"
echo "===================================="
echo ""
echo "📊 Fresh State:"
echo "  • Database: Clean with demo users (admin@estathub.local, investor@estathub.local)"
echo "  • Properties: 2 demo properties seeded"
echo "  • Blockchain: Fresh Fabric network with deployed chaincode"
echo "  • Wallet: New application identity enrolled"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start backend: cd backend && npm run dev:ts"
echo "  2. Start frontend: cd frontend && npm run dev"
echo "  3. Test blockchain: ./scripts/testBlockchain.sh"
echo ""
echo -e "${BLUE}Ready for Frontend UI development!${NC}"
echo ""