#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Query Blockchain Script
 * This script queries the Hyperledger Fabric blockchain to view:
 * - Properties initialized on-chain
 * - Token holdings for users
 * - Transaction history
 */

const fs = require('fs')
const path = require('path')
const { Gateway, Wallets } = require('fabric-network')

async function main() {
  const repoRoot = path.resolve(__dirname, '../..')
  const backendDir = path.join(repoRoot, 'backend')
  const walletPath = path.join(backendDir, 'fabric', 'wallet')
  const connProfilePath = path.join(backendDir, 'fabric', 'connection-org1.json')

  if (!fs.existsSync(connProfilePath)) {
    console.error('❌ Connection profile not found. Run enrollAppUser.js first.')
    process.exit(1)
  }

  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet not found. Run enrollAppUser.js first.')
    process.exit(1)
  }

  const ccp = JSON.parse(fs.readFileSync(connProfilePath, 'utf8'))
  const wallet = await Wallets.newFileSystemWallet(walletPath)
  const identity = await wallet.get('appUser')

  if (!identity) {
    console.error('❌ appUser identity not found in wallet.')
    process.exit(1)
  }

  const gateway = new Gateway()
  
  try {
    await gateway.connect(ccp, {
      wallet,
      identity: 'appUser',
      discovery: { enabled: true, asLocalhost: true },
    })

    const network = await gateway.getNetwork('mychannel')
    const contract = network.getContract('estathub')

    console.log('\n🔍 Querying Blockchain...\n')
    console.log('=' .repeat(80))

    // Query holdings for different users
    const userIds = [1, 2, 3] // Admin, Investor, and potential third user

    for (const userId of userIds) {
      console.log(`\n📊 Holdings for User ID ${userId}:`)
      console.log('-'.repeat(80))
      
      try {
        const result = await contract.evaluateTransaction('GetHoldings', String(userId))
        const holdings = JSON.parse(result.toString())
        
        if (holdings.length === 0) {
          console.log('  No holdings found')
        } else {
          holdings.forEach(h => {
            console.log(`  Property ID: ${h.propertyId}, Tokens: ${h.tokens}`)
          })
        }
      } catch (err) {
        console.log(`  Error querying holdings: ${err.message}`)
      }
    }

    // Query specific property balances
    console.log('\n\n💰 Token Balances by Property:')
    console.log('=' .repeat(80))
    
    const propertyIds = [1, 2, 3]
    
    for (const propId of propertyIds) {
      console.log(`\nProperty ID ${propId}:`)
      console.log('-'.repeat(80))
      
      for (const userId of userIds) {
        try {
          const result = await contract.evaluateTransaction('GetBalance', String(userId), String(propId))
          const balance = parseInt(result.toString())
          
          if (balance > 0) {
            console.log(`  User ${userId}: ${balance} tokens`)
          }
        } catch (err) {
          // Property might not exist, skip
        }
      }
    }

    console.log('\n\n✅ Blockchain query completed!')
    console.log('=' .repeat(80))
    console.log('\n💡 Tip: To see more details, check the database OnChainEvent table')
    console.log('   Run: cd backend && npx prisma studio\n')

  } catch (error) {
    console.error('\n❌ Error querying blockchain:', error.message)
    console.error('\nMake sure:')
    console.error('  1. Fabric network is running (docker ps)')
    console.error('  2. Chaincode is deployed (./scripts/fabric/deploy_chaincode.sh)')
    console.error('  3. Connection profile and wallet are set up\n')
    process.exit(1)
  } finally {
    gateway.disconnect()
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
