import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { TransactionType } from '@prisma/client'
import { auth } from '../middleware/auth'
import { 
  isFabricEnabled, 
  getAllPropertiesFromLedger, 
  getAllDeedsFromLedger,
  getAllHoldingsFromLedger,
  getTransactionHistoryFromLedger
} from '../lib/fabric'

export const blockchainRouter = Router()

// Temporary test endpoint - REMOVE IN PRODUCTION
blockchainRouter.post('/test-mint', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const { propertyId, userId, tokens } = req.body
    const pid = Number(propertyId)
    const qty = Number(tokens)
    
    if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'invalid_input' })
    }
    
const targetUser = await prisma.user.findUnique({ where: { id: String(userId) } })
    if (!targetUser) return res.status(404).json({ error: 'user_not_found' })
    
const prop = await prisma.property.findUnique({ where: { id: String(pid) } })
    if (!prop) return res.status(404).json({ error: 'property_not_found' })
    if (prop.remainingTokens < qty) return res.status(400).json({ error: 'insufficient_remaining_tokens' })
    
    let fabricResult: { txId: string; dbTx?: any } | undefined
    console.log('🔗 Fabric enabled:', isFabricEnabled())
    
    if (isFabricEnabled()) {
      try {
        console.log('🧪 Test minting tokens on Fabric...', { propertyId: pid, userId: targetUser.id, tokens: qty })
        const { submitMintTokens } = await import('../lib/fabric.js')
        fabricResult = await submitMintTokens({ propertyId: pid, userId: Number(targetUser.id), tokens: qty })
        console.log('✅ Test mint successful on Fabric:', fabricResult)
      } catch (fabricError: any) {
        console.error('❌ Fabric test mint failed:', fabricError.message || fabricError)
        return res.status(500).json({ error: 'fabric_mint_failed', details: fabricError.message })
      }
    }
    
    // Only create database records if Fabric didn't already create them
    let dbTx: any
    console.log('🔍 Test-mint fabricResult:', fabricResult)
    console.log('🔍 Test-mint fabricResult?.dbTx:', fabricResult?.dbTx)
    
    if (!fabricResult?.dbTx) {
      console.log('🔍 Test-mint: Fabric did not create dbTx, creating it in controller...')
      await prisma.$transaction(async tx => {
        await tx.property.update({ where: { id: String(pid) }, data: { remainingTokens: { decrement: qty } } })
        await tx.holding.upsert({
          where: { userId_propertyId: { userId: targetUser!.id, propertyId: String(pid) } },
          update: { tokens: { increment: qty } },
          create: { userId: targetUser!.id, propertyId: String(pid), tokens: qty },
        })
        // Record on-chain reference if available
        dbTx = await tx.transaction.create({
          data: {
            userId: targetUser!.id,
            tenantId: targetUser!.tenantId,
            type: TransactionType.TOKEN_MINT,
            amount: qty,
            note: 'Test blockchain mint',
            blockchainTxId: fabricResult?.txId,
          },
        })
      })
    } else {
      // Still need to update property and holdings even if Fabric created the transaction
            await prisma.$transaction(async tx => {
              await tx.property.update({ where: { id: String(pid) }, data: { remainingTokens: { decrement: qty } } })
      await tx.holding.upsert({
      where: { userId_propertyId: { userId: targetUser!.id, propertyId: String(pid) } },
      update: { tokens: { increment: qty } },
      create: { userId: targetUser!.id, propertyId: String(pid), tokens: qty },
              })
      })
      dbTx = fabricResult.dbTx
    }
    
    return res.json({ 
      success: true, 
      message: 'test_tokens_minted',
      data: { 
        propertyId: pid, 
        userId: targetUser.id, 
        tokens: qty, 
        blockchainTxId: fabricResult?.txId,
        dbTransaction: dbTx,
        mintedTokens: qty,
        assetId: pid,
        status: 'SUCCESS',
        metadata: {
          orderId: `TEST-ORDER-${Date.now()}`,
          fabricResponse: fabricResult
        }
      } 
    })
  } catch (error: any) {
    console.error('❌ Test mint failed:', error)
    return res.status(500).json({ error: error.message })
  }
})

// GET /events - Get all on-chain events from Fabric or database
blockchainRouter.get('/events', auth(true), async (_req: Request, res: Response) => {

  // Prevent caching of blockchain data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  
  try {
    let events: any[] = []
    
    if (isFabricEnabled()) {
      try {
        // Try to get events from Fabric first
        // For now, we'll get from database but mark which have blockchain TxIds
        const dbEvents = await prisma.onChainEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
        events = dbEvents.map(e => ({
          ...e,
          source: 'blockchain',
          txId: e.txId
        }))
        console.log(`✅ Loaded ${events.length} events from database (blockchain-tracked)`)
      } catch (err) {
        console.warn('⚠️  Failed to load events from blockchain, falling back to database:', err)
        const dbEvents = await prisma.onChainEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
        events = dbEvents
      }
    } else {
      // Fabric disabled, use database
      const dbEvents = await prisma.onChainEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      events = dbEvents
    }
    
    return res.json({ events })
  } catch (e) {
    console.error('Failed to fetch on-chain events:', e)
    return res.status(500).json({ error: 'failed_to_fetch_events' })
  }
})

// GET /properties - Get properties from Fabric ledger
blockchainRouter.get('/properties', auth(true), async (_req: Request, res: Response) => {
  // Prevent caching of blockchain data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  
  try {
    let properties: any[] = []
    
    if (isFabricEnabled()) {
      try {
        // Get properties directly from Fabric ledger
        const ledgerProps = await getAllPropertiesFromLedger()
        console.log(`✅ Loaded ${ledgerProps.length} properties from Fabric ledger`)
        
        // Enrich with database info for display - ONLY APPROVED properties
        const dbProps = await prisma.property.findMany({
          where: {
            status: 'APPROVED' // Only show approved properties
          },
          select: {
            id: true,
            title: true,
            totalTokens: true,
            remainingTokens: true,
            blockchainTxId: true,
            createdAt: true,
            status: true,
          },
        })
        
        // Create a set of approved property IDs
        const approvedIds = new Set(dbProps.map(dp => String(dp.id)))
        
        // Merge ledger data with database data - FILTER to only approved properties
        properties = ledgerProps
          .filter(lp => approvedIds.has(lp.propertyId)) // Only include if approved in DB
          .map(lp => {
            const dbProp = dbProps.find(dp => String(dp.id) === lp.propertyId)
            return {
              id: lp.propertyId,
              title: lp.title,
              totalTokens: lp.totalTokens,
              remainingTokens: lp.remainingTokens,
              status: lp.status,
              blockchainTxId: dbProp?.blockchainTxId || 'ON_CHAIN',
              createdAt: lp.createdAt,
              source: 'fabric_ledger'
            }
          })
        
        console.log(`📊 Filtered to ${properties.length} approved properties (from ${ledgerProps.length} on chain)`)
      } catch (err) {
        console.warn('⚠️  Failed to load properties from Fabric, falling back to database:', err)
        const dbProps = await prisma.property.findMany({
          select: {
            id: true,
            title: true,
            totalTokens: true,
            remainingTokens: true,
            blockchainTxId: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        })
        properties = dbProps.map(p => ({ ...p, source: 'database_fallback' }))
      }
    } else {
      // Fabric disabled, use database
      const dbProps = await prisma.property.findMany({
        select: {
          id: true,
          title: true,
          totalTokens: true,
          remainingTokens: true,
          blockchainTxId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      properties = dbProps.map(p => ({ ...p, source: 'database' }))
    }
    
    return res.json({ properties })
  } catch (e) {
    console.error('Failed to fetch properties:', e)
    return res.status(500).json({ error: 'failed_to_fetch_properties' })
  }
})

// GET /certificates - Get digital deeds from Fabric ledger
blockchainRouter.get('/certificates', auth(true), async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  
  try {
    let certificates: any[] = []
    
    if (isFabricEnabled()) {
      try {
        // Get deeds from Fabric ledger
        const ledgerDeeds = await getAllDeedsFromLedger()
        console.log(`✅ Loaded ${ledgerDeeds.length} deeds from Fabric ledger`)
        
        // Get user and property info from database
        const userIds = [...new Set(ledgerDeeds.map(d => d.userId))]
        const propertyIds = [...new Set(ledgerDeeds.map(d => d.propertyId))]
        
        const [users, properties] = await Promise.all([
          prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }),
          prisma.property.findMany({ where: { id: { in: propertyIds } }, select: { id: true, title: true } })
        ])
        
        const userMap = new Map(users.map(u => [u.id, u.email]))
        const propMap = new Map(properties.map(p => [p.id, p.title]))
        
        certificates = ledgerDeeds.map(deed => ({
          id: deed.deedNumber,
          code: deed.deedNumber,
          userId: deed.userId,
          userEmail: userMap.get(deed.userId) || 'Unknown',
          propertyId: deed.propertyId,
          propertyTitle: propMap.get(deed.propertyId) || 'Unknown',
          orderId: deed.orderId,
          blockchainTxId: 'ON_CHAIN',
          status: deed.status,
          ownedTokens: deed.ownedTokens,
          ownershipPct: deed.ownershipPct,
          createdAt: deed.createdAt,
          issuedAt: deed.issuedAt,
          source: 'fabric_ledger'
        }))
      } catch (err) {
        console.warn('⚠️  Failed to load deeds from Fabric, falling back to database:', err)
        const dbCerts = await prisma.certificate.findMany({
          include: {
            user: { select: { email: true } },
            property: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
        certificates = dbCerts.map(cert => ({
          id: cert.id,
          code: cert.code,
          userId: cert.userId,
          userEmail: cert.user.email,
          propertyId: cert.propertyId,
          propertyTitle: cert.property.title,
          orderId: cert.orderId,
          blockchainTxId: cert.blockchainTxId,
          createdAt: cert.createdAt,
          source: 'database_fallback'
        }))
      }
    } else {
      // Fabric disabled, use database
      const dbCerts = await prisma.certificate.findMany({
        include: {
          user: { select: { email: true } },
          property: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      certificates = dbCerts.map(cert => ({
        id: cert.id,
        code: cert.code,
        userId: cert.userId,
        userEmail: cert.user.email,
        propertyId: cert.propertyId,
        propertyTitle: cert.property.title,
        orderId: cert.orderId,
        blockchainTxId: cert.blockchainTxId,
        createdAt: cert.createdAt,
        source: 'database'
      }))
    }
    
    return res.json({ certificates })
  } catch (e) {
    console.error('Failed to fetch certificates:', e)
    return res.status(500).json({ error: 'failed_to_fetch_certificates' })
  }
})

// GET /transactions - Get transactions from Fabric ledger
blockchainRouter.get('/transactions', auth(true), async (_req: Request, res: Response) => {
  // Prevent caching of blockchain data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  
  try {
    let transactions: any[] = []
    
    if (isFabricEnabled()) {
      try {
        // Get both holdings and deeds from Fabric as transactions
        const [holdings, deeds] = await Promise.all([
          getAllHoldingsFromLedger(),
          getAllDeedsFromLedger()
        ])
        console.log(`✅ Loaded ${holdings.length} holdings and ${deeds.length} deeds from Fabric ledger`)
        if (deeds.length > 0) {
          console.log('🔍 DEBUG: Sample deed structure:', JSON.stringify(deeds[0], null, 2))
        }
        
        // Get user info from database
        const allUserIds = [...new Set([...holdings.map(h => String(h.userId)), ...deeds.map(d => String(d.userId))])]
        const users = await prisma.user.findMany({ 
          where: { id: { in: allUserIds } }, 
          select: { id: true, email: true } 
        })
        const userMap = new Map(users.map(u => [u.id, u.email]))
        
        // Convert holdings to transaction format
        const holdingTxns = holdings.map((h, idx) => ({
          id: `fabric-holding-${idx}`,
          userId: h.userId,
          userEmail: userMap.get(h.userId) || 'Unknown',
          type: TransactionType.TOKEN_MINT,
          amount: 0,
          ref: `Property ${h.propertyId}`,
          note: `${h.tokens} tokens for property ${h.propertyId}`,
          blockchainTxId: 'ON_CHAIN',
          createdAt: new Date().toISOString(),
          source: 'fabric_ledger',
          tokens: h.tokens,
          propertyId: h.propertyId
        }))
        
        // Convert deeds to transaction format
        const deedTxns = deeds.map((d, idx) => ({
          id: `fabric-deed-${idx}`,
          userId: d.userId,
          userEmail: userMap.get(d.userId) || 'Unknown',
          type: 'DEED_ISSUED',
          amount: 0,
          ref: `Property ${d.propertyId}`,
          note: `Deed ${d.deedNumber} issued for property ${d.propertyId}`,
          blockchainTxId: 'ON_CHAIN',
          createdAt: d.createdAt || new Date().toISOString(),
          source: 'fabric_ledger',
          propertyId: d.propertyId,
          deedNumber: d.deedNumber
        }))
        
        // Also get database transactions
        const dbTxns = await prisma.transaction.findMany({
          include: {
            user: { select: { email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
        
        console.log(`📊 Total database transactions: ${dbTxns.length}`)
        console.log(`📊 Database transactions with blockchainTxId: ${dbTxns.filter(t => t.blockchainTxId).length}`)
       console.log(`📊 TOKEN_MINT transactions: ${dbTxns.filter(t => t.type === TransactionType.TOKEN_MINT).length}`)

        
        // Debug: Show all transaction types in database
        const txTypes = dbTxns.reduce((acc: any, tx) => {
          acc[tx.type] = (acc[tx.type] || 0) + 1
          return acc
        }, {})
        console.log(`📊 Transaction types in database:`, txTypes)
        
        // Debug: Show last 5 transactions
        console.log(`📊 Last 5 transactions:`, dbTxns.slice(0, 5).map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          blockchainTxId: t.blockchainTxId,
          note: t.note
        })))
        
        // Include all TOKEN_MINT transactions (with or without blockchainTxId)
        const dbMapped = dbTxns
          .filter(txn => txn.type === 'TOKEN_MINT') // All token mint transactions
          .map(txn => ({
            id: txn.id,
            userId: txn.userId,
            userEmail: txn.user.email,
            type: txn.type,
            amount: txn.amount,
            ref: txn.ref,
            note: txn.note,
            blockchainTxId: txn.blockchainTxId,
            createdAt: txn.createdAt,
            source: 'database_with_chain'
          }))
        
       transactions = [...holdingTxns, ...deedTxns, ...dbMapped]
       console.log(`📊 Total blockchain transactions returned: ${transactions.length} (${holdingTxns.length} holdings + ${deedTxns.length} deeds from Fabric + ${dbMapped.length} from DB)`)
      } catch (err) {
        console.warn('⚠️  Failed to load transactions from Fabric, falling back to database:', err)
        const dbTxns = await prisma.transaction.findMany({
          include: {
            user: { select: { email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
        transactions = dbTxns.map(txn => ({
          id: txn.id,
          userId: txn.userId,
          userEmail: txn.user.email,
          type: txn.type,
          amount: txn.amount,
          ref: txn.ref,
          note: txn.note,
          blockchainTxId: txn.blockchainTxId,
          createdAt: txn.createdAt,
          source: 'database_fallback'
        }))
      }
    } else {
      // Fabric disabled, use database
      const dbTxns = await prisma.transaction.findMany({
        include: {
          user: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      transactions = dbTxns.map(txn => ({
        id: txn.id,
        userId: txn.userId,
        userEmail: txn.user.email,
        type: txn.type,
        amount: txn.amount,
        ref: txn.ref,
        note: txn.note,
        blockchainTxId: txn.blockchainTxId,
        createdAt: txn.createdAt,
        source: 'database'
      }))
    }
    
    return res.json({ transactions })
  } catch (e) {
    console.error('Failed to fetch transactions:', e)
    return res.status(500).json({ error: 'failed_to_fetch_transactions' })
  }
})

// GET /stats - Get blockchain statistics from Fabric
blockchainRouter.get('/stats', auth(true), async (_req: Request, res: Response) => {
  // Prevent caching of blockchain data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  
  try {
    let stats: any = {}
    
    if (isFabricEnabled()) {
      try {
        // Get stats from Fabric ledger
        const [properties, deeds, holdings] = await Promise.all([
          getAllPropertiesFromLedger(),
          getAllDeedsFromLedger(),
          getAllHoldingsFromLedger()
        ])
        
        stats = {
          totalEvents: await prisma.onChainEvent.count(),
          propertiesOnChain: properties.length,
          certificatesOnChain: deeds.length,
          tokenMints: holdings.length,
          source: 'fabric_ledger'
        }
        
        console.log(`✅ Blockchain stats from Fabric: ${properties.length} properties, ${deeds.length} deeds, ${holdings.length} holdings`)
      } catch (err) {
        console.warn('⚠️  Failed to load stats from Fabric, falling back to database:', err)
        const [
          totalEvents,
          propertiesOnChain,
          certificatesOnChain,
          tokenMints,
        ] = await Promise.all([
          prisma.onChainEvent.count(),
          prisma.property.count({ where: { blockchainTxId: { not: null } } }),
          prisma.certificate.count({ where: { blockchainTxId: { not: null } } }),
          prisma.transaction.count({ 
            where: { 
              blockchainTxId: { not: null },
              type: TransactionType.TOKEN_MINT
            } 
          }),
        ])
        stats = {
          totalEvents,
          propertiesOnChain,
          certificatesOnChain,
          tokenMints,
          source: 'database_fallback'
        }
      }
    } else {
      // Fabric disabled, use database
      const [
        totalEvents,
        propertiesOnChain,
        certificatesOnChain,
        tokenMints,
      ] = await Promise.all([
        prisma.onChainEvent.count(),
        prisma.property.count(),
        prisma.certificate.count(),
        prisma.transaction.count({ where: { type: TransactionType.TOKEN_MINT } }),
      ])
      stats = {
        totalEvents,
        propertiesOnChain,
        certificatesOnChain,
        tokenMints,
        source: 'database'
      }
    }
    
    return res.json(stats)
  } catch (e) {
    console.error('Failed to fetch blockchain stats:', e)
    return res.status(500).json({ error: 'failed_to_fetch_stats' })
  }
})

// GET /verify - Verify blockchain synchronization status
blockchainRouter.get('/verify', auth(true), async (_req: Request, res: Response) => {
  try {
    console.log('🔍 Starting blockchain verification...')
    
    // Check if Fabric is enabled
    if (!isFabricEnabled()) {
      return res.json({
        enabled: false,
        message: 'Blockchain (Fabric) is disabled. Set USE_FABRIC=true to enable.'
      })
    }
    
    // Get all approved properties with blockchain status
    const properties = await prisma.property.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        title: true,
        status: true,
        blockchainTxId: true,
        approvedAt: true,
        createdAt: true
      },
      orderBy: { id: 'desc' }
    })
    
    // Get all certificates/deeds with blockchain status
    const certificates = await prisma.digitalDeed.findMany({
      select: {
        id: true,
        deedNumber: true,
        userId: true,
        propertyId: true,
        ownedTokens: true,
        status: true,
        blockchainTxId: true,
        issuedAt: true,
        user: { select: { email: true } },
        property: { select: { title: true } }
      },
      orderBy: { id: 'desc' }
    })
    
    // Get all blockchain transactions (token mints)
    const transactions = await prisma.transaction.findMany({
      where: {
        type: TransactionType.TOKEN_MINT
      },
      select: {
        id: true,
        userId: true,
        type: true,
        ref: true,
        note: true,
        blockchainTxId: true,
        createdAt: true,
        user: { select: { email: true } }
      },
      orderBy: { id: 'desc' },
      take: 100
    })
    
    // Calculate sync statistics
    const propertiesSynced = properties.filter(p => p.blockchainTxId).length
    const certificatesSynced = certificates.filter(c => c.blockchainTxId).length
    const transactionsSynced = transactions.filter(t => t.blockchainTxId).length
    
    const syncStatus = {
      enabled: true,
      timestamp: new Date().toISOString(),
      summary: {
        properties: {
          total: properties.length,
          synced: propertiesSynced,
          pending: properties.length - propertiesSynced,
          syncRate: properties.length > 0 ? ((propertiesSynced / properties.length) * 100).toFixed(1) + '%' : '0%'
        },
        certificates: {
          total: certificates.length,
          synced: certificatesSynced,
          pending: certificates.length - certificatesSynced,
          syncRate: certificates.length > 0 ? ((certificatesSynced / certificates.length) * 100).toFixed(1) + '%' : '0%'
        },
        transactions: {
          total: transactions.length,
          synced: transactionsSynced,
          pending: transactions.length - transactionsSynced,
          syncRate: transactions.length > 0 ? ((transactionsSynced / transactions.length) * 100).toFixed(1) + '%' : '0%'
        }
      },
      details: {
        properties: properties.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          blockchainTxId: p.blockchainTxId || null,
          synced: !!p.blockchainTxId,
          approvedAt: p.approvedAt,
          createdAt: p.createdAt
        })),
        certificates: certificates.map(c => ({
          id: c.id,
          deedNumber: c.deedNumber,
          userId: c.userId,
          userEmail: c.user.email,
          propertyId: c.propertyId,
          propertyTitle: c.property.title,
          ownedTokens: c.ownedTokens,
          status: c.status,
          blockchainTxId: c.blockchainTxId || null,
          synced: !!c.blockchainTxId,
          issuedAt: c.issuedAt
        })),
        transactions: transactions.map(t => ({
          id: t.id,
          userId: t.userId,
          userEmail: t.user.email,
          type: t.type,
          ref: t.ref,
          note: t.note,
          blockchainTxId: t.blockchainTxId || null,
          synced: !!t.blockchainTxId,
          createdAt: t.createdAt
        }))
      }
    }
    
    console.log('✅ Blockchain verification complete')
    console.log(`   Properties: ${propertiesSynced}/${properties.length} synced`)
    console.log(`   Certificates: ${certificatesSynced}/${certificates.length} synced`)
    console.log(`   Transactions: ${transactionsSynced}/${transactions.length} synced`)
    
       return res.json(syncStatus)
  } catch (e) {
    console.error('Failed to verify blockchain sync:', e)
    return res.status(500).json({ error: 'failed_to_verify_sync' })
  }
})

export default blockchainRouter 
