import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { submitInitProperty, submitTxn, isFabricEnabled } from '../lib/fabric'
import { uploadMultiplePropertyImages, getFileUrl, errorHandler, validateRequired, throwApiError } from '../middleware/roles'
import { auth } from '../middleware/auth'

export const propertyRouter = Router()

// GET /api/properties?status=APPROVED (optional filter)
propertyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query
    const where = status ? { status: status as any } : {}
    
    const list = await prisma.property.findMany({ 
      where,
      orderBy: { id: 'desc' } 
    })
    
    const mapped = list.map(p => ({
      id: p.id,
      name: p.title,
      location: p.location,
      description: p.description,
      imageUrl: p.imageUrl,
      images: p.images || [], // Include all images
      totalValue: p.totalValue,
      tokenPrice: p.tokenPrice,
      totalTokens: p.totalTokens,
      remainingTokens: p.remainingTokens,
      monthlyYield: p.monthlyYield,
      expectedROI: p.expectedROI,
      status: p.status,
      ownerId: p.ownerId,
      ownerName: p.ownerName,
      submittedDate: p.submittedAt,
      approvedDate: p.approvedAt,
      rejectedDate: p.rejectedAt,
      rejectionReason: p.rejectionReason,
    }))
    res.json(mapped)
  } catch (e) {
    res.status(500).json({ error: 'failed_to_list_properties' })
  }
})

// GET /api/properties/:id - Get single property by ID
propertyRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const property = await prisma.property.findUnique({
      where: { id }
    })
    
    if (!property) {
      return res.status(404).json({ error: 'property_not_found' })
    }
    
    // Map to frontend format
    const mapped = {
      id: property.id,
      name: property.title,
      location: property.location,
      description: property.description,
      imageUrl: property.imageUrl,
      images: property.images || [],
      totalValue: property.totalValue,
      tokenPrice: property.tokenPrice,
      totalTokens: property.totalTokens,
      remainingTokens: property.remainingTokens,
      monthlyYield: property.monthlyYield,
      expectedROI: property.expectedROI,
      status: property.status,
      ownerId: property.ownerId,
      ownerName: property.ownerName,
      submittedDate: property.submittedAt,
      approvedDate: property.approvedAt,
      rejectedDate: property.rejectedAt,
      rejectionReason: property.rejectionReason,
    }
    
    res.json(mapped)
  } catch (e) {
    console.error('Property fetch error:', e)
    res.status(500).json({ error: 'failed_to_fetch_property' })
  }
})

// POST /api/properties
// Body: { name, location, description, imageUrl, propertyValue, expectedROI, totalTokens, tokenPrice, ownerName }
// Files: images (multiple files)
propertyRouter.post('/', auth(true), uploadMultiplePropertyImages, async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { 
      name, location, description, imageUrl, 
      propertyValue, expectedROI, totalTokens, tokenPrice, 
      ownerName, ownerId 
    } = req.body || {}
    
    // Get authenticated user ID if available
    const authenticatedUserId = req.user?.userId
    const authenticatedUserEmail = req.user?.email
    
    // Use centralized validation
    validateRequired(req.body, ['name', 'totalTokens', 'tokenPrice'])

    // Handle uploaded images
    let images: string[] = []
    if (req.files && Array.isArray(req.files)) {
      images = req.files.map(file => getFileUrl(file.filename))
    }
    
    // If no new images but imageUrl provided in body, use it
    if (images.length === 0 && imageUrl) {
      images = [imageUrl]
    }

    // Convert string values to numbers
    const totalTokensNum = Number(totalTokens)
    const tokenPriceNum = Number(tokenPrice)
    const propertyValueNum = propertyValue ? Number(propertyValue) : (totalTokensNum * tokenPriceNum)
    const expectedROINum = expectedROI ? Number(expectedROI) : 0

    const created = await prisma.property.create({
      data: {
        title: name,
        location: location || '',
        description: description || '',
        imageUrl: images.length > 0 ? images[0] : '', // Keep first image as primary
        images: images, // Store all images
        totalValue: propertyValueNum,
        tokenPrice: tokenPriceNum,
        totalTokens: totalTokensNum,
        remainingTokens: totalTokensNum,
        monthlyYield: 0,
        expectedROI: expectedROINum,
        status: 'PENDING',
        ownerId: ownerId || authenticatedUserId || null,
        ownerName: ownerName || req.user?.name || authenticatedUserEmail || 'Property Owner',
        tenantId: req.user?.tenantId || 'default-tenant',
      },
    })

    // Note: Property will be registered to blockchain only after admin approval
    // See PATCH /api/properties/:id endpoint for blockchain registration logic

    res.status(201).json({
      id: created.id,
      name: created.title,
      location: created.location,
      description: created.description,
      status: created.status,
      message: 'Property submitted successfully! Awaiting admin approval.'
    })
  } catch (e) {
    next(e) // Pass to centralized error handler
  }
})

// PATCH /api/properties/:id - Update property (generic update for admin)
propertyRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!status) {
      return res.status(400).json({ error: 'status is required' })
    }
    
    const updateData: any = { status }
    
    if (status === 'APPROVED') {
      updateData.approvedAt = new Date()
    } else if (status === 'REJECTED') {
      updateData.rejectedAt = new Date()
      updateData.rejectionReason = req.body.reason || 'No reason provided'
    }
    
    const updated = await prisma.property.update({
      where: { id },
      data: updateData,
    })
    
    // Register property on blockchain when approved
    if (status === 'APPROVED' && isFabricEnabled()) {
      try {
        // Step 1: Register property on blockchain
        const { txId: registerTxId } = await submitTxn(
          'estathub',
          'RegisterPropertySimple',
          updated.id.toString(),
          updated.title,
          updated.location || '',
          updated.totalTokens.toString()
        )
        
        console.log(`✅ Property ${updated.id} registered on Fabric ledger with TxID: ${registerTxId}`)
        
        // Step 2: Approve property on blockchain
        const { txId: approveTxId } = await submitTxn(
          'estathub',
          'ApproveProperty',
          updated.id.toString()
        )
        
        console.log(`✅ Property ${updated.id} approved on Fabric ledger with TxID: ${approveTxId}`)
        
        // Step 3: Tokenize property on blockchain (make it available for investment)
        const { txId: tokenizeTxId } = await submitTxn(
          'estathub',
          'TokenizeProperty',
          updated.id.toString()
        )
        
        console.log(`✅ Property ${updated.id} tokenized on Fabric ledger with TxID: ${tokenizeTxId}`)
        
        // Update property with blockchain txId (use the tokenize txId as final state)
        await prisma.property.update({
          where: { id },
          data: { blockchainTxId: tokenizeTxId } as any
        })
        
        // Record on-chain events for blockchain explorer
        try {
          // Use individual upserts instead of createMany with skipDuplicates (not supported on SQLite)
          const events = [
            {
              txId: registerTxId,
              type: 'TOKEN_MINT' as any,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'RegisterPropertySimple', propertyId: updated.id, title: updated.title })
            },
            {
              txId: approveTxId,
              type: 'TOKEN_MINT' as any,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'ApproveProperty', propertyId: updated.id })
            },
            {
              txId: tokenizeTxId,
              type: 'TOKEN_MINT' as any,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'TokenizeProperty', propertyId: updated.id, totalTokens: updated.totalTokens })
            }
          ]
          
          for (const event of events) {
            await prisma.onChainEvent.upsert({
              where: { txId: event.txId },
              update: {},
              create: event
            })
          }
          console.log(`📝 Recorded 3 on-chain events for property ${updated.id}`)
        } catch (eventErr) {
          console.warn('⚠️  Failed to record on-chain events:', eventErr)
        }
      } catch (fabricError) {
        console.error(`⚠️  Failed to register property ${updated.id} on blockchain:`, fabricError)
        // Continue anyway - property is approved in database
      }
    }
    
    res.json({ 
      success: true, 
      message: `Property ${status.toLowerCase()} successfully`,
      property: updated 
    })
  } catch (e) {
    console.error('Property update error:', e)
    res.status(500).json({ error: 'failed_to_update_property' })
  }
})

// PUT /api/properties/:id/approve - Admin approves property
propertyRouter.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const updated = await prisma.property.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    })
    
    // Register property on blockchain when approved
    if (isFabricEnabled()) {
      try {
        // Step 1: Register property on blockchain
        const { txId: registerTxId } = await submitTxn(
          'estathub',
          'RegisterPropertySimple',
          updated.id.toString(),
          updated.title,
          updated.location || '',
          updated.totalTokens.toString()
        )
        
        console.log(`✅ Property ${updated.id} registered on Fabric ledger with TxID: ${registerTxId}`)
        
        // Step 2: Approve property on blockchain
        const { txId: approveTxId } = await submitTxn(
          'estathub',
          'ApproveProperty',
          updated.id.toString()
        )
        
        console.log(`✅ Property ${updated.id} approved on Fabric ledger with TxID: ${approveTxId}`)
        
        // Step 3: Tokenize property on blockchain (make it available for investment)
        const { txId: tokenizeTxId } = await submitTxn(
          'estathub',
          'TokenizeProperty',
          updated.id.toString()
        )
        
        console.log(`✅ Property ${updated.id} tokenized on Fabric ledger with TxID: ${tokenizeTxId}`)
        
        // Update property with blockchain txId (use the tokenize txId as final state)
        await prisma.property.update({
          where: { id },
          data: { blockchainTxId: tokenizeTxId } as any
        })
        
        // Record on-chain events for blockchain explorer
        try {
          // Use individual upserts instead of createMany with skipDuplicates (not supported on SQLite)
          const events = [
            {
              txId: registerTxId,
              type: 'TOKEN_MINT' as any,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'RegisterPropertySimple', propertyId: updated.id, title: updated.title })
            },
            {
              txId: approveTxId,
              type: 'TOKEN_MINT' as any,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'ApproveProperty', propertyId: updated.id })
            },
            {
              txId: tokenizeTxId,
              type: 'TOKEN_MINT' as any,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'TokenizeProperty', propertyId: updated.id, totalTokens: updated.totalTokens })
            }
          ]
          
          for (const event of events) {
            await prisma.onChainEvent.upsert({
              where: { txId: event.txId },
              update: {},
              create: event
            })
          }
          console.log(`📝 Recorded 3 on-chain events for property ${updated.id}`)
        } catch (eventErr) {
          console.warn('⚠️  Failed to record on-chain events:', eventErr)
        }
      } catch (fabricError) {
        console.error(`⚠️  Failed to register property ${updated.id} on blockchain:`, fabricError)
        // Continue anyway - property is approved in database
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Property approved successfully',
      property: updated 
    })
  } catch (e) {
    res.status(500).json({ error: 'failed_to_approve_property' })
  }
})

// PUT /api/properties/:id/reject - Admin rejects property
propertyRouter.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body || {}
    
    const updated = await prisma.property.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason || 'No reason provided',
      },
    })
    
    res.json({ 
      success: true, 
      message: 'Property rejected',
      property: updated 
    })
  } catch (e) {
    res.status(500).json({ error: 'failed_to_reject_property' })
  }
})

// GET /api/properties/:id/holdings - Get all investors/holdings for a property
propertyRouter.get('/:id/holdings', async (req: Request, res: Response) => {
  try {
  const { id } = req.params

if (!id) {
  return res.status(400).json({ error: 'invalid_property_id' })
}
    
    // Get all holdings for this property with user details
    const holdings = await prisma.holding.findMany({
     where: { propertyId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { tokens: 'desc' }
    })
    
    // Get property to calculate ownership percentages
   const property = await prisma.property.findUnique({
  where: { id },
  select: { totalTokens: true }
})
    
    if (!property) {
      return res.status(404).json({ error: 'property_not_found' })
    }
    
    // Map holdings with ownership percentage
    const mapped = holdings.map(h => ({
      id: h.id,
      userId: h.userId,
      userEmail: h.user.email,
      userName: h.user.name || h.user.email,
      tokens: h.tokens,
      ownershipPercentage: ((h.tokens / property.totalTokens) * 100).toFixed(2)
    }))
    
    res.json(mapped)
  } catch (e) {
    console.error('Get holdings error:', e)
    res.status(500).json({ error: 'failed_to_get_holdings' })
  }
})

export default propertyRouter
