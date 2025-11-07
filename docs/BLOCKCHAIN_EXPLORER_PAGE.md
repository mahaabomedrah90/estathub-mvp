# Blockchain Explorer Page

## Overview

A dedicated web page to view and track all blockchain transactions in the Estathub MVP platform.

## Access

**URL:** http://localhost:5173/blockchain

**Navigation:** Click "⛓️ Blockchain" in the top navigation menu

## Features

### 📊 Statistics Dashboard

Four key metrics displayed at the top:
- **On-Chain Events** - Total blockchain events recorded
- **Blockchain Properties** - Properties initialized on blockchain
- **Blockchain Certificates** - Certificates with blockchain transaction IDs
- **Token Mints** - Total token minting transactions

### 📑 Four Tabs

#### 1. On-Chain Events Tab
Shows all blockchain events with:
- Event ID
- Event Type (TOKEN_MINT, TOKEN_TRANSFER, etc.)
- Transaction ID (blockchain txId)
- Details (User ID, Property ID, Order ID, Payload)
- Timestamp

#### 2. Properties Tab
Shows properties recorded on blockchain with:
- Property ID
- Title
- Total Tokens
- Blockchain Transaction ID
- Creation Date

#### 3. Certificates Tab
Shows certificates with blockchain records:
- Certificate Code
- User Email
- Property Title
- Blockchain Transaction ID
- Issue Date

#### 4. Transactions Tab
Shows transactions with blockchain records:
- Transaction ID
- Type (TOKEN_MINT, DEPOSIT, WITHDRAWAL)
- User Email
- Amount
- Blockchain Transaction ID
- Notes
- Timestamp

## Backend API Endpoints

The page uses these new API endpoints:

```
GET /api/blockchain/events       - Get all on-chain events
GET /api/blockchain/properties   - Get properties with blockchain txIds
GET /api/blockchain/certificates - Get certificates with blockchain txIds
GET /api/blockchain/transactions - Get transactions with blockchain txIds
GET /api/blockchain/stats        - Get blockchain statistics
```

## How to Use

### 1. Start the Application

**Backend:**
```bash
cd backend
npm run dev:ts
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 2. Login

Navigate to http://localhost:5173/login and login with:
- Admin: `admin@estathub.local`
- Investor: `investor@estathub.local`

### 3. View Blockchain Data

Click "⛓️ Blockchain" in the navigation menu to see:
- All blockchain transactions
- On-chain events
- Properties on blockchain
- Certificates with blockchain records

### 4. Create New Blockchain Transactions

To see new transactions appear:

**Option 1: Use Test Script**
```bash
./scripts/testBlockchain.sh
```

**Option 2: Through the UI**
1. Login as Admin
2. Create a new property (will be recorded on blockchain if `USE_FABRIC=true`)
3. Login as Investor
4. Deposit funds
5. Create and confirm an order (tokens will be minted on blockchain)
6. Refresh the Blockchain Explorer page

### 5. Refresh Data

Click the "🔄 Refresh" button to reload blockchain data.

## Visual Features

- **Color-Coded Cards** - Different colors for each metric
- **Tabbed Interface** - Easy navigation between data types
- **Responsive Tables** - Scrollable on mobile devices
- **Transaction ID Display** - Monospace font with background highlighting
- **Type Badges** - Color-coded badges for transaction types
- **Timestamps** - Localized date/time format

## Empty States

When no blockchain data exists, helpful messages are shown:
- "No on-chain events recorded yet..."
- "No properties on blockchain yet..."
- "No blockchain certificates yet..."
- "No blockchain transactions yet..."

Each message includes guidance on how to create blockchain records.

## Technical Details

### Frontend Component
- **File:** `frontend/src/pages/BlockchainExplorer.jsx`
- **Framework:** React with hooks
- **Styling:** Tailwind CSS
- **Routing:** React Router

### Backend Controller
- **File:** `backend/src/controllers/blockchain.controller.ts`
- **Authentication:** JWT required
- **Database:** Prisma ORM
- **Limits:** Returns last 100 records per endpoint

### Data Flow

```
User → Frontend (BlockchainExplorer.jsx)
       ↓
       API Request with JWT token
       ↓
Backend (blockchain.controller.ts)
       ↓
       Prisma queries database
       ↓
       Returns JSON response
       ↓
Frontend displays in tables
```

## Troubleshooting

### "Failed to load blockchain data"

**Cause:** Backend not running or authentication failed

**Solution:**
1. Ensure backend is running on port 5001
2. Check you're logged in
3. Check browser console for errors

### No Data Showing

**Cause:** No blockchain transactions created yet

**Solution:**
1. Enable Fabric: Set `USE_FABRIC=true` in `backend/.env`
2. Ensure Fabric network is running: `docker ps`
3. Run test script: `./scripts/testBlockchain.sh`
4. Refresh the page

### "Unauthorized" Error

**Cause:** JWT token expired or missing

**Solution:**
1. Logout and login again
2. Check token is being sent in Authorization header

## Future Enhancements

Potential improvements:
- **Search & Filter** - Search by transaction ID, user, property
- **Date Range Filter** - Filter by date range
- **Export to CSV** - Download blockchain data
- **Real-time Updates** - WebSocket for live updates
- **Transaction Details Modal** - Click to see full transaction details
- **Blockchain Verification** - Button to verify transaction on actual blockchain
- **Charts & Graphs** - Visual representation of blockchain activity

## Related Documentation

- [VIEW_BLOCKCHAIN_TRANSACTIONS.md](./VIEW_BLOCKCHAIN_TRANSACTIONS.md) - CLI tools for viewing blockchain data
- [phase3 plan](./phase3%20plan) - Hyperledger Fabric integration plan

## Summary

The Blockchain Explorer page provides a user-friendly web interface to:
- ✅ View all blockchain transactions
- ✅ Track on-chain events
- ✅ Monitor properties on blockchain
- ✅ Verify certificates with blockchain records
- ✅ See token minting transactions
- ✅ Access real-time blockchain data

Navigate to http://localhost:5173/blockchain to start exploring!
