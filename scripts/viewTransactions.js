#!/usr/bin/env node
/**
 * View Database Transactions Script
 * Shows all blockchain-related records in the database
 * 
 * Run from project root: node scripts/viewTransactions.js
 */

const path = require('path')
const { execSync } = require('child_process')

// Change to backend directory to use its Prisma client
const backendDir = path.join(__dirname, '../backend')
process.chdir(backendDir)

const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'))
const prisma = new PrismaClient()

async function main() {
  console.log('\n🔍 Viewing Database Transactions and Blockchain Records\n')
  console.log('='.repeat(100))

  // 1. Properties with blockchain txIds
  console.log('\n📋 PROPERTIES (with blockchain records):')
  console.log('-'.repeat(100))
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      totalTokens: true,
      remainingTokens: true,
      blockchainTxId: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' }
  })

  if (properties.length === 0) {
    console.log('  No properties found')
  } else {
    properties.forEach(p => {
      console.log(`\n  Property #${p.id}: ${p.title}`)
      console.log(`    Total Tokens: ${p.totalTokens}, Remaining: ${p.remainingTokens}`)
      console.log(`    Blockchain TxID: ${p.blockchainTxId || 'Not on blockchain'}`)
      console.log(`    Created: ${p.createdAt.toISOString()}`)
    })
  }

  // 2. On-Chain Events
  console.log('\n\n⛓️  ON-CHAIN EVENTS:')
  console.log('-'.repeat(100))
  const events = await prisma.onChainEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (events.length === 0) {
    console.log('  No on-chain events recorded')
  } else {
    events.forEach(e => {
      console.log(`\n  Event #${e.id} - ${e.type}`)
      console.log(`    TxID: ${e.txId}`)
      console.log(`    User ID: ${e.userId || 'N/A'}, Property ID: ${e.propertyId || 'N/A'}, Order ID: ${e.orderId || 'N/A'}`)
      console.log(`    Payload: ${JSON.stringify(e.payload)}`)
      console.log(`    Timestamp: ${e.createdAt.toISOString()}`)
    })
  }

  // 3. Certificates with blockchain txIds
  console.log('\n\n📜 CERTIFICATES (with blockchain records):')
  console.log('-'.repeat(100))
  const certificates = await prisma.certificate.findMany({
    include: {
      user: { select: { email: true } },
      property: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (certificates.length === 0) {
    console.log('  No certificates found')
  } else {
    certificates.forEach(c => {
      console.log(`\n  Certificate: ${c.code}`)
      console.log(`    User: ${c.user.email}`)
      console.log(`    Property: ${c.property.title}`)
      console.log(`    Order ID: ${c.orderId}`)
      console.log(`    Blockchain TxID: ${c.blockchainTxId || 'Not on blockchain'}`)
      console.log(`    Issued: ${c.createdAt.toISOString()}`)
    })
  }

  // 4. Transactions with blockchain txIds
  console.log('\n\n💸 TRANSACTIONS (with blockchain records):')
  console.log('-'.repeat(100))
  const transactions = await prisma.transaction.findMany({
    include: {
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (transactions.length === 0) {
    console.log('  No transactions found')
  } else {
    transactions.forEach(t => {
      console.log(`\n  Transaction #${t.id} - ${t.type}`)
      console.log(`    User: ${t.user.email}`)
      console.log(`    Amount: ${t.amount}`)
      console.log(`    Reference: ${t.ref || 'N/A'}`)
      console.log(`    Blockchain TxID: ${t.blockchainTxId || 'Not on blockchain'}`)
      console.log(`    Note: ${t.note || 'N/A'}`)
      console.log(`    Timestamp: ${t.createdAt.toISOString()}`)
    })
  }

  // 5. Holdings (off-chain records)
  console.log('\n\n🏦 HOLDINGS (database records):')
  console.log('-'.repeat(100))
  const holdings = await prisma.holding.findMany({
    include: {
      user: { select: { email: true } },
      property: { select: { title: true } },
    },
    orderBy: { userId: 'asc' },
  })

  if (holdings.length === 0) {
    console.log('  No holdings found')
  } else {
    holdings.forEach(h => {
      console.log(`\n  ${h.user.email} owns ${h.tokens} tokens of "${h.property.title}"`)
    })
  }

  console.log('\n\n' + '='.repeat(100))
  console.log('✅ Database query completed!\n')
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
