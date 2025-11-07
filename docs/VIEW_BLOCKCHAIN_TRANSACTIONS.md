# How to View Blockchain Transactions

This guide shows you how to view and verify blockchain transactions in the Estathub MVP.

## Prerequisites

- Fabric network running (`docker ps` should show peer and orderer containers)
- Backend server running with `USE_FABRIC=true`
- Chaincode deployed

## Methods to View Blockchain Data

### 1. View Database Records (Off-Chain Mirror)

The database stores references to all blockchain transactions:

```bash
node scripts/viewTransactions.js
```

This shows:
- **Properties** with `blockchainTxId` field
- **OnChainEvents** - all blockchain events recorded
- **Certificates** with blockchain transaction IDs
- **Transactions** with `blockchainTxId` for token mints
- **Holdings** (database mirror of on-chain data)

### 2. Query Blockchain Directly

Query the actual blockchain ledger:

```bash
node scripts/fabric/queryBlockchain.js
```

This queries:
- Token holdings for each user (directly from blockchain)
- Token balances by property
- Real-time on-chain data

### 3. Use Prisma Studio (Visual Database Browser)

```bash
cd backend
npx prisma studio
```

Then open http://localhost:5555 to browse:
- `OnChainEvent` table - all blockchain events
- `Property` table - see `blockchainTxId` column
- `Certificate` table - see `blockchainTxId` column  
- `Transaction` table - see `blockchainTxId` column

### 4. Check Backend Logs

When Fabric is enabled, the backend logs blockchain transaction IDs:

```bash
# Watch backend logs
tail -f backend/logs/app.log  # if logging to file
# or check terminal where backend is running
```

## Creating Test Blockchain Transactions

### Quick Test Script

```bash
./scripts/testBlockchain.sh
```

This automatically:
1. Creates a property (recorded on blockchain)
2. Creates an order
3. Mints tokens (recorded on blockchain)
4. Shows you how to view results

### Manual Testing

#### 1. Create Property (InitProperty on blockchain)

```bash
# Login as admin
curl -X POST http://localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@estathub.local"}'

# Use the token from response
curl -X POST http://localhost:5001/api/properties \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -d '{
    "name":"My Blockchain Property",
    "totalValue":1000000,
    "tokenPrice":100,
    "totalTokens":10000
  }'
```

**What happens:**
- Property created in database
- `InitProperty` called on blockchain with propertyId and totalTokens
- `blockchainTxId` saved to Property record
- `OnChainEvent` created with type `TOKEN_MINT`

#### 2. Mint Tokens (via Order Confirmation)

```bash
# Login as investor
curl -X POST http://localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"investor@estathub.local"}'

# Deposit funds
curl -X POST http://localhost:5001/api/wallet/deposit \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_INVESTOR_TOKEN' \
  -d '{"amount":10000}'

# Create order
curl -X POST http://localhost:5001/api/orders \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_INVESTOR_TOKEN' \
  -d '{"propertyId":1,"tokens":100}'

# Confirm payment (mints on blockchain)
curl -X POST http://localhost:5001/api/payments/confirm \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_INVESTOR_TOKEN' \
  -d '{"orderId":ORDER_ID}'
```

**What happens:**
- Order marked as PAID
- `MintTokens` called on blockchain
- Tokens minted to investor's address
- `blockchainTxId` saved to Certificate
- Transaction record created with `blockchainTxId`
- Holding updated (both on-chain and off-chain)

## Understanding Blockchain Transaction IDs

A blockchain transaction ID (txId) looks like:
```
e6bdee722a888ee856537944d593e07fa9508b91dfacf1dc51fc443fb7e93bf6
```

This is a unique identifier for each transaction on the Hyperledger Fabric blockchain.

### Where txIds are Stored

1. **Property.blockchainTxId** - Transaction that initialized the property
2. **Certificate.blockchainTxId** - Transaction that minted tokens for this certificate
3. **Transaction.blockchainTxId** - For TOKEN_MINT type transactions
4. **OnChainEvent.txId** - All blockchain events with full payload

## Verifying Blockchain Integration

### Check 1: Fabric Network Running

```bash
docker ps | grep -E "peer|orderer"
```

Should show:
- `peer0.org1.example.com`
- `peer0.org2.example.com`
- `orderer.example.com`

### Check 2: Backend Connected to Fabric

```bash
# Check .env file
cat backend/.env | grep USE_FABRIC
# Should show: USE_FABRIC=true
```

### Check 3: Chaincode Deployed

```bash
cd ~/fabric-samples/test-network
peer lifecycle chaincode querycommitted --channelID mychannel --name estathub
```

Should show chaincode is committed.

### Check 4: Create Test Transaction

```bash
./scripts/testBlockchain.sh
```

Then verify:
```bash
node scripts/viewTransactions.js | grep "Blockchain TxID"
```

Should see actual transaction IDs instead of "Not on blockchain".

## Troubleshooting

### "fabric_disabled" Error

**Problem:** Backend returns `fabric_disabled` error

**Solution:**
```bash
# Check .env
cat backend/.env | grep USE_FABRIC
# Should be: USE_FABRIC=true

# Restart backend
cd backend
npm run dev:ts
```

### "fabric_connection_profile_missing" Error

**Problem:** Connection profile not found

**Solution:**
```bash
cd scripts/fabric
node enrollAppUser.js
```

### Chaincode Not Initialized

**Problem:** "chaincode has not been initialized"

**Solution:**
```bash
cd scripts/fabric
./deploy_chaincode.sh
```

### No Blockchain TxIDs in Database

**Problem:** All records show "Not on blockchain"

**Possible causes:**
1. Fabric was disabled when transactions were created
2. Fabric network wasn't running
3. Chaincode wasn't deployed

**Solution:**
1. Enable Fabric: Set `USE_FABRIC=true` in backend/.env
2. Ensure network is running: `docker ps`
3. Create new transactions with `./scripts/testBlockchain.sh`

## Advanced: Query Specific Blockchain Data

### Get Holdings for User

```javascript
// In Node.js or backend code
const { evaluateGetHoldings } = require('./backend/src/lib/fabric')
const holdings = await evaluateGetHoldings(userId)
console.log(holdings)
```

### Get Balance for User and Property

```javascript
const { evaluateGetBalance } = require('./backend/src/lib/fabric')
const balance = await evaluateGetBalance(userId, propertyId)
console.log(`User ${userId} has ${balance} tokens of property ${propertyId}`)
```

## Summary

To see blockchain transactions:

1. **Enable Fabric**: `USE_FABRIC=true` in `.env`
2. **Ensure network running**: `docker ps`
3. **Create test transactions**: `./scripts/testBlockchain.sh`
4. **View database records**: `node scripts/viewTransactions.js`
5. **Query blockchain**: `node scripts/fabric/queryBlockchain.js`
6. **Browse visually**: `cd backend && npx prisma studio`

All blockchain transactions are recorded with unique transaction IDs that prove immutability and provide an audit trail.
