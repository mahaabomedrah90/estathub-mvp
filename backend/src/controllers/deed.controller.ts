import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import * as fabric from '../lib/fabric'
import { auth } from '../middleware/auth'
import { $Enums } from '@prisma/client'
import {
  generateDeedNumber,
  calculateDeedHash,
  generateQRCodeData,
  generateDeedPDF,
  validateDeedData,
  userHasDeedForProperty
} from '../lib/deedService'

export const deedRouter = Router()

// ============================================================================
// GET /deeds - Get all deeds (admin) or user's deeds
// ============================================================================
deedRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const { userId, propertyId, status } = req.query
    
    const where: any = {}
    if (userId) where.userId = String(userId)
    if (propertyId) where.propertyId = String(propertyId)
    if (status) where.status = status
    
    const deeds = await prisma.digitalDeed.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(deeds)
  } catch (error) {
    console.error('Error fetching deeds:', error)
    res.status(500).json({ error: 'failed_to_fetch_deeds' })
  }
})

// ============================================================================
// GET /deeds/:deedNumber - Get specific deed
// ============================================================================
deedRouter.get('/:deedNumber', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const { deedNumber } = req.params
    
    const deed = await prisma.digitalDeed.findUnique({
      where: { deedNumber },
      include: {
        user: { select: { id: true, name: true, email: true } },
        property: {
          select: {
            id: true,
            title: true,
            location: true,
            municipality: true,
            district: true,
            totalTokens: true
          }
        }
      }
    })
    
    if (!deed) {
      return res.status(404).json({ error: 'deed_not_found' })
    }
    
    res.json(deed)
  } catch (error) {
    console.error('Error fetching deed:', error)
    res.status(500).json({ error: 'failed_to_fetch_deed' })
  }
})

// ============================================================================
// POST /deeds/issue - Issue a new digital deed
// Body: { userId, propertyId, orderId }
// ============================================================================
deedRouter.post('/issue', auth(true), async (req: Request & { user?: any }, res: Response) => {
    try {
    const { userId, propertyId, orderId } = req.body
    
    if (!userId || !propertyId) {
      return res.status(400).json({ error: 'userId and propertyId required' })
    }
    
    // Validate input
    const holding = await prisma.holding.findUnique({
      where: {
        userId_propertyId: {
          userId: String(userId),
          propertyId: String(propertyId)
        }
      }
    })
    
    if (!holding || holding.tokens <= 0) {
      return res.status(400).json({ error: 'no_tokens_owned' })
    }
    
    // Get all existing deeds for this user and property
    const existingDeeds = await prisma.digitalDeed.findMany({
      where: {
        userId: String(userId),
        propertyId: String(propertyId)
      }
    })
    
    // Calculate total tokens already covered by existing deeds
    const totalIssuedTokens = existingDeeds.reduce((sum, deed) => sum + deed.ownedTokens, 0)
    
    // Get property details first (needed for both new and existing deeds)
    const property = await prisma.property.findUnique({
      where: { id: String(propertyId) }
    })
    
    const user = await prisma.user.findUnique({
      where: { id: String(userId) }
    })
    
    if (!property || !user) {
      return res.status(404).json({ error: 'property_or_user_not_found' })
    }
    
    // Check if all tokens are already covered by existing deeds
    if (totalIssuedTokens >= holding.tokens) {
      console.log(`ℹ️  All ${holding.tokens} tokens already covered by ${existingDeeds.length} existing deed(s)`)
      return res.json({ 
        success: true,
        deed: existingDeeds[0], // Return first deed for compatibility
        message: `All tokens already covered by existing deeds`,
        alreadyExists: true
      })
    }
    
    // Calculate how many NEW tokens need a deed
    const newTokensToIssue = holding.tokens - totalIssuedTokens
    console.log(`📝 Issuing NEW deed for ${newTokensToIssue} additional tokens (Total: ${holding.tokens}, Already issued: ${totalIssuedTokens})`)
    
    // Property and user already fetched above
    
    // Generate deed number
    const deedNumber = await generateDeedNumber()
    
    // Calculate ownership percentage for NEW tokens only
    const ownershipPct = (newTokensToIssue / property.totalTokens) * 100
    
    // Generate PDF (mock for now)
    const issuedAt = new Date().toISOString()
    const { pdfUrl, pdfHash } = await generateDeedPDF({
      deedNumber,
      userName: user.name || user.email,
      propertyTitle: property.title,
      ownedTokens: newTokensToIssue, // Only new tokens
      ownershipPct,
      issuedAt,
      municipality: property.municipality,
      district: property.district
    })
    
    // Calculate deed hash for blockchain
    const deedHash = calculateDeedHash({
      deedNumber,
      userId: Number(userId),
      propertyId: Number(propertyId),
      ownedTokens: newTokensToIssue, // Only new tokens
      issuedAt
    })
    
    // Generate QR code data
    const qrCodeData = generateQRCodeData(deedNumber, deedHash)
    
    // Create deed in database
    const deed = await prisma.digitalDeed.create({
      data: {
        deedNumber,
        userId: String(userId),
        propertyId: String(propertyId),
        orderId: orderId ? String(orderId) : null,
        ownedTokens: newTokensToIssue, // Only new tokens
        ownershipPct,
        status: 'ISSUED',
        deedHash,
        qrCodeData,
        pdfUrl,
        issuedAt: new Date(issuedAt)
      }
    })
    
    // Issue deed on blockchain if Fabric is enabled
    let blockchainTxId: string | undefined
    if (fabric.isFabricEnabled()) {
      try {
        console.log(`🔗 Issuing deed ${deedNumber} on blockchain...`)
        
        const { txId } = await fabric.issueDeed(
          deedNumber,
          String(userId),
          String(propertyId),
          newTokensToIssue, // Only new tokens
          deedHash,
          qrCodeData,
          orderId ? String(orderId) : undefined
        )
        blockchainTxId = txId
        
        // Update deed with blockchain tx ID
        await prisma.digitalDeed.update({
          where: { id: deed.id },
          data: { blockchainTxId: txId }
        })
        
        // Record on-chain event for blockchain explorer
        try {
          await prisma.onChainEvent.create({
            data: {
              txId: txId,
              type: $Enums.OnChainEventType.TOKEN_MINT, // Reusing existing enum
              userId: userId,
              propertyId: propertyId,
              orderId: orderId || undefined,
              payload: JSON.stringify({ 
                action: 'IssueDeed', 
                deedNumber,
                ownedTokens: newTokensToIssue, // Only new tokens
                propertyId,
                userId 
              })
            }
          })
          console.log(`📝 Recorded on-chain event for deed ${deedNumber}`)
        } catch (eventErr) {
          console.warn('⚠️  Failed to record on-chain event:', eventErr)
        }
        
        console.log(`✅ Digital deed issued on blockchain: ${deedNumber}, txId: ${txId}`)
        console.log(`   User: ${userId}, Property: ${propertyId}, Tokens: ${holding.tokens}`)
      } catch (fabricError: any) {
        const errorMsg = String(fabricError?.message || fabricError)
        
        // If deed already exists on blockchain, that's OK - we have it in database
        if (errorMsg.includes('deed_already_exists')) {
          console.warn(`⚠️  Deed ${deedNumber} already exists on blockchain, continuing with database record`)
        } else {
          console.error(`❌ Blockchain deed issuance failed for ${deedNumber}:`, errorMsg)
          console.error(`   Database record created successfully, but blockchain sync failed.`)
        }
        // Continue anyway - deed is in database
      }
    } else {
      console.log(`ℹ️  Fabric disabled - deed ${deedNumber} created in database only`)
    }
    
    console.log(`✅ Deed issued: ${deedNumber} for user ${userId}`)
    
    res.json({
      success: true,
      deed: {
        ...deed,
        blockchainTxId
      }
    })
  } catch (error) {
    console.error('Error issuing deed:', error)
    res.status(500).json({ error: 'failed_to_issue_deed' })
  }
})

// ============================================================================
// POST /deeds/verify - Verify deed by hash (QR code scan)
// Body: { deedNumber, hash }
// ============================================================================
deedRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { deedNumber, hash } = req.body
    
    if (!deedNumber || !hash) {
      return res.status(400).json({ error: 'deedNumber and hash required' })
    }
    
    // Check database first
    const deed = await prisma.digitalDeed.findUnique({
      where: { deedNumber },
      include: {
        user: { select: { name: true, email: true } },
        property: { select: { title: true, location: true } }
      }
    })
    
    if (!deed) {
      return res.json({ valid: false, error: 'deed_not_found' })
    }
    
    // Verify hash
    const isValid = deed.deedHash === hash && deed.status === 'ISSUED'
    
    // Also verify on blockchain if enabled
    let blockchainVerification: any = null
    if (fabric.isFabricEnabled()) {
      try {
        blockchainVerification = await fabric.verifyDeedHash(deedNumber, hash)
      } catch (error) {
        console.error('Blockchain verification failed:', error)
      }
    }
    
    res.json({
      valid: isValid,
      deed: isValid ? {
        deedNumber: deed.deedNumber,
        status: deed.status,
        userName: deed.user.name || deed.user.email,
        propertyTitle: deed.property.title,
        ownedTokens: deed.ownedTokens,
        ownershipPct: deed.ownershipPct,
        issuedAt: deed.issuedAt
      } : null,
      blockchainVerification
    })
  } catch (error) {
    console.error('Error verifying deed:', error)
    res.status(500).json({ error: 'failed_to_verify_deed' })
  }
})

// ============================================================================
// GET /deeds/user/:userId - Get all deeds for a user
// ============================================================================
deedRouter.get('/user/:userId', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const { userId } = req.params
    
    const deeds = await prisma.digitalDeed.findMany({
      where: { userId: String(userId) },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            location: true,
            imageUrl: true,
            municipality: true,
            district: true
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    })
    
    res.json(deeds)
  } catch (error) {
    console.error('Error fetching user deeds:', error)
    res.status(500).json({ error: 'failed_to_fetch_user_deeds' })
  }
})

// ============================================================================
// POST /deeds/:deedNumber/revoke - Revoke a deed (admin only)
// Body: { reason }
// ============================================================================
deedRouter.post('/:deedNumber/revoke', auth(true), async (req: Request & { user?: any }, res: Response) => {
    try {
    const { deedNumber } = req.params
    const { reason } = req.body
    
    if (!reason) {
      return res.status(400).json({ error: 'reason required' })
    }
    
    const deed = await prisma.digitalDeed.findUnique({
      where: { deedNumber }
    })
    
    if (!deed) {
      return res.status(404).json({ error: 'deed_not_found' })
    }
    
    if (deed.status === 'REVOKED') {
      return res.status(400).json({ error: 'deed_already_revoked' })
    }
    
    // Update in database
    const updated = await prisma.digitalDeed.update({
      where: { deedNumber },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: reason
      }
    })
    
    // Revoke on blockchain if enabled
    if (fabric.isFabricEnabled()) {
      try {
        await fabric.revokeDeed(deedNumber, reason)
      } catch (error) {
        console.error('Blockchain revocation failed:', error)
      }
    }
    
    console.log(`✅ Deed revoked: ${deedNumber}`)
    
    res.json({ success: true, deed: updated })
  } catch (error) {
    console.error('Error revoking deed:', error)
    res.status(500).json({ error: 'failed_to_revoke_deed' })
  }
})

// ============================================================================
// DELETE /deeds/:deedNumber - Delete a deed (development only)
// ============================================================================
deedRouter.delete('/:deedNumber', async (req: Request, res: Response) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'not_allowed_in_production' })
    }
     
    const { deedNumber } = req.params
    
    const deed = await prisma.digitalDeed.findUnique({
      where: { deedNumber }
    })
    
    if (!deed) {
      return res.status(404).json({ error: 'deed_not_found' })
    }
    
    // Delete from database
    await prisma.digitalDeed.delete({
      where: { deedNumber }
    })
    
    console.log(`🗑️  Deed deleted: ${deedNumber}`)
    
    res.json({ success: true, message: `Deed ${deedNumber} deleted` })
  } catch (error) {
    console.error('Error deleting deed:', error)
    res.status(500).json({ error: 'failed_to_delete_deed' })
  }
})

export default deedRouter