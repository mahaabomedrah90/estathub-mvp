#!/usr/bin/env node
/**
 * Retro-Sync Script for Estathub Blockchain
 * 
 * This script backfills previously approved data from the database to Fabric blockchain:
 * - Approved properties → RegisterPropertySimple + ApproveProperty + TokenizeProperty
 * - Confirmed payments → MintTokens + InvestProperty
 * - Issued certificates → IssueDeed
 * 
 * Usage:
 *   node scripts/retro-sync-blockchain.js
 *   node scripts/retro-sync-blockchain.js --dry-run
 *   node scripts/retro-sync-blockchain.js --properties-only
 *   node scripts/retro-sync-blockchain.js --payments-only
 *   node scripts/retro-sync-blockchain.js --certificates-only
 */

const path = require('path')

// Change to backend directory to use its modules
const backendDir = path.join(__dirname, '../backend')
process.chdir(backendDir)

// Load environment variables from backend directory
require(path.join(backendDir, 'node_modules/dotenv')).config()

// Register tsx to handle TypeScript imports
try {
  require(path.join(backendDir, 'node_modules/tsx/dist/cjs/api/index.cjs')).register()
} catch (e) {
  // Try alternative tsx register path
  try {
    require(path.join(backendDir, 'node_modules/@esbuild-kit/esm-loader'))
  } catch (e2) {
    console.error('❌ Could not register TypeScript loader. Please run with tsx instead:')
    console.error('   npx tsx scripts/retro-sync-blockchain.js --dry-run')
    process.exit(1)
  }
}

// Check if Fabric is enabled
if (process.env.USE_FABRIC !== 'true') {
  console.error('❌ Fabric is disabled. Set USE_FABRIC=true in backend/.env')
  process.exit(1)
}

const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'))
const prisma = new PrismaClient()

// Import fabric functions from TypeScript source
const fabric = require(path.join(backendDir, 'src/lib/fabric.ts'))

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const propertiesOnly = args.includes('--properties-only')
const paymentsOnly = args.includes('--payments-only')
const certificatesOnly = args.includes('--certificates-only')

console.log('🔄 Estathub Blockchain Retro-Sync Script')
console.log('========================================\n')

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No blockchain writes will be performed\n')
}

async function syncProperties() {
  console.log('\n📋 Syncing Properties...')
  console.log('========================\n')
  
  // Get all approved properties without blockchain TxId
  const properties = await prisma.property.findMany({
    where: {
      status: 'APPROVED',
      blockchainTxId: null
    },
    orderBy: { id: 'asc' }
  })
  
  console.log(`Found ${properties.length} approved properties without blockchain TxId\n`)
  
  let synced = 0
  let failed = 0
  
  for (const property of properties) {
    try {
      console.log(`Processing Property #${property.id}: ${property.title}`)
      
      if (isDryRun) {
        console.log('  [DRY RUN] Would register, approve, and tokenize on blockchain')
        synced++
        continue
      }
      
      // Step 1: Register property
      const { txId: registerTxId } = await fabric.submitTxn(
        'estathub',
        'RegisterPropertySimple',
        property.id.toString(),
        property.title,
        property.location || '',
        property.totalTokens.toString()
      )
      console.log(`  ✅ Registered: ${registerTxId}`)
      
      // Step 2: Approve property
      const { txId: approveTxId } = await fabric.submitTxn(
        'estathub',
        'ApproveProperty',
        property.id.toString()
      )
      console.log(`  ✅ Approved: ${approveTxId}`)
      
      // Step 3: Tokenize property
      const { txId: tokenizeTxId } = await fabric.submitTxn(
        'estathub',
        'TokenizeProperty',
        property.id.toString()
      )
      console.log(`  ✅ Tokenized: ${tokenizeTxId}`)
      
      // Update database with blockchain TxId
      await prisma.property.update({
        where: { id: property.id },
        data: { blockchainTxId: tokenizeTxId }
      })
      
      // Record on-chain events (use upsert instead of createMany for SQLite compatibility)
      try {
        const events = [
          {
            txId: registerTxId,
            type: 'TOKEN_MINT',
            propertyId: property.id,
            payload: JSON.stringify({ action: 'RegisterPropertySimple', propertyId: property.id, title: property.title, source: 'retro-sync' })
          },
          {
            txId: approveTxId,
            type: 'TOKEN_MINT',
            propertyId: property.id,
            payload: JSON.stringify({ action: 'ApproveProperty', propertyId: property.id, source: 'retro-sync' })
          },
          {
            txId: tokenizeTxId,
            type: 'TOKEN_MINT',
            propertyId: property.id,
            payload: JSON.stringify({ action: 'TokenizeProperty', propertyId: property.id, totalTokens: property.totalTokens, source: 'retro-sync' })
          }
        ]
        
        for (const event of events) {
          await prisma.onChainEvent.upsert({
            where: { txId: event.txId },
            update: {},
            create: event
          })
        }
      } catch (eventErr) {
        console.log(`  ⚠️  Failed to record events: ${eventErr.message}`)
      }
      
      console.log(`  💾 Database updated with TxId: ${tokenizeTxId}\n`)
      synced++
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}\n`)
      failed++
    }
  }
  
  console.log(`\n✅ Properties: ${synced} synced, ${failed} failed`)
}

async function syncPayments() {
  console.log('\n💰 Syncing Payments...')
  console.log('=====================\n')
  
  // Get all issued orders without blockchain transaction record
  const orders = await prisma.order.findMany({
    where: {
      status: 'ISSUED'
    },
    include: {
      user: true,
      property: true
    },
    orderBy: { id: 'asc' }
  })
  
  console.log(`Found ${orders.length} issued orders\n`)
  
  // Check which ones already have blockchain transactions
  const existingTxs = await prisma.transaction.findMany({
    where: {
      type: 'TOKEN_MINT',
      blockchainTxId: { not: null }
    },
    select: { ref: true }
  })
  
  const syncedOrderIds = new Set(existingTxs.map(tx => tx.ref))
  const ordersToSync = orders.filter(o => !syncedOrderIds.has(String(o.id)))
  
  console.log(`${ordersToSync.length} orders need blockchain sync\n`)
  
  let synced = 0
  let failed = 0
  
  for (const order of ordersToSync) {
    try {
      console.log(`Processing Order #${order.id}: ${order.tokens} tokens for Property #${order.propertyId}`)
      
      if (isDryRun) {
        console.log('  [DRY RUN] Would mint tokens and record investment')
        synced++
        continue
      }
      
      const userEmail = order.user?.email || `user-${order.userId}`
      
      // Step 1: Mint tokens
      const { txId: mintTxId } = await fabric.submitTxn(
        'estathub',
        'MintTokens',
        order.propertyId.toString(),
        order.userId.toString(),
        order.tokens.toString(),
        order.id.toString()
      )
      console.log(`  ✅ Tokens minted: ${mintTxId}`)
      
      // Step 2: Record investment
      try {
        const { txId: investTxId } = await fabric.submitTxn(
          'estathub',
          'InvestProperty',
          order.propertyId.toString(),
          userEmail,
          order.tokens.toString()
        )
        console.log(`  ✅ Investment recorded: ${investTxId}`)
      } catch (investErr) {
        console.log(`  ⚠️  Investment record failed (tokens minted): ${investErr.message}`)
      }
      
      // Create blockchain transaction record
      await prisma.transaction.create({
        data: {
          userId: order.userId,
          type: 'TOKEN_MINT',
          amount: 0,
          ref: String(order.id),
          blockchainTxId: mintTxId,
          note: `Retro-sync: ${order.tokens} tokens minted for property ${order.propertyId}`
        }
      })
      
      // Update certificate with blockchain TxId
      await prisma.certificate.updateMany({
        where: { orderId: order.id },
        data: { blockchainTxId: mintTxId }
      })
      
      // Record on-chain event
      try {
        await prisma.onChainEvent.create({
          data: {
            txId: mintTxId,
            type: 'TOKEN_MINT',
            userId: order.userId,
            propertyId: order.propertyId,
            orderId: order.id,
            payload: JSON.stringify({ 
              action: 'MintTokens', 
              tokens: order.tokens, 
              propertyId: order.propertyId,
              userId: order.userId,
              source: 'retro-sync'
            })
          }
        })
      } catch (eventErr) {
        console.log(`  ⚠️  Failed to record event: ${eventErr.message}`)
      }
      
      console.log(`  💾 Database updated\n`)
      synced++
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}\n`)
      failed++
    }
  }
  
  console.log(`\n✅ Payments: ${synced} synced, ${failed} failed`)
}

async function syncCertificates() {
  console.log('\n📜 Syncing Certificates (Digital Deeds)...')
  console.log('=========================================\n')
  
  // Get all issued deeds without blockchain TxId
  const deeds = await prisma.digitalDeed.findMany({
    where: {
      status: 'ISSUED',
      blockchainTxId: null
    },
    include: {
      user: true,
      property: true
    },
    orderBy: { id: 'asc' }
  })
  
  console.log(`Found ${deeds.length} issued deeds without blockchain TxId\n`)
  
  let synced = 0
  let failed = 0
  
  for (const deed of deeds) {
    try {
      console.log(`Processing Deed ${deed.deedNumber}: User #${deed.userId}, Property #${deed.propertyId}`)
      
      if (isDryRun) {
        console.log('  [DRY RUN] Would issue deed on blockchain')
        synced++
        continue
      }
      
      // Issue deed on blockchain
      const { txId } = await fabric.issueDeed(
        deed.deedNumber,
        String(deed.userId),
        String(deed.propertyId),
        deed.ownedTokens,
        deed.deedHash || 'RETRO_SYNC_HASH',
        deed.qrCodeData || '',
        deed.orderId ? String(deed.orderId) : undefined
      )
      
      console.log(`  ✅ Deed issued: ${txId}`)
      
      // Update database
      await prisma.digitalDeed.update({
        where: { id: deed.id },
        data: { blockchainTxId: txId }
      })
      
      // Record on-chain event
      try {
        await prisma.onChainEvent.create({
          data: {
            txId: txId,
            type: 'TOKEN_MINT',
            userId: deed.userId,
            propertyId: deed.propertyId,
            orderId: deed.orderId || undefined,
            payload: JSON.stringify({ 
              action: 'IssueDeed', 
              deedNumber: deed.deedNumber,
              ownedTokens: deed.ownedTokens,
              propertyId: deed.propertyId,
              userId: deed.userId,
              source: 'retro-sync'
            })
          }
        })
      } catch (eventErr) {
        console.log(`  ⚠️  Failed to record event: ${eventErr.message}`)
      }
      
      console.log(`  💾 Database updated\n`)
      synced++
      
    } catch (error) {
      // If deed already exists, that's OK
      if (error.message?.includes('deed_already_exists')) {
        console.log(`  ⚠️  Deed already exists on blockchain (skipping)\n`)
        synced++
      } else {
        console.error(`  ❌ Failed: ${error.message}\n`)
        failed++
      }
    }
  }
  
  console.log(`\n✅ Certificates: ${synced} synced, ${failed} failed`)
}

async function main() {
  try {
    const startTime = Date.now()
    
    // Sync based on flags
    if (!paymentsOnly && !certificatesOnly) {
      await syncProperties()
    }
    
    if (!propertiesOnly && !certificatesOnly) {
      await syncPayments()
    }
    
    if (!propertiesOnly && !paymentsOnly) {
      await syncCertificates()
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('\n========================================')
    console.log(`✅ Retro-sync complete in ${duration}s`)
    console.log('========================================\n')
    
    if (isDryRun) {
      console.log('💡 Run without --dry-run to perform actual blockchain writes\n')
    }
    
  } catch (error) {
    console.error('\n❌ Retro-sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()