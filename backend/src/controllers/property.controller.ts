import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { submitInitProperty, submitTxn, isFabricEnabled } from '../lib/fabric'
import { uploadMultiplePropertyImages, getFileUrl, errorHandler, validateRequired, throwApiError } from '../middleware/roles'
import { auth } from '../middleware/auth'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { $Enums } from '@prisma/client'

export const propertyRouter = Router()

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/properties/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf'
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF allowed.'))
    }
  }
})

// GET /api/properties?status=APPROVED (optional filter)
propertyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query
    const where = status ? { status: status as $Enums.PropertyStatus } : {}
    
    const list = await prisma.property.findMany({ 
      where,
      orderBy: { id: 'desc' } 
    })
    
    const mapped = list.map(p => ({
      // Basic fields
      id: p.id,
      name: p.title,
      title: p.title,
      location: p.location,
      description: p.description,
      imageUrl: p.imageUrl,
      images: p.images || [],
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
      
      // Step 1: Legal Verification
      ownershipType: p.ownershipType,
      deedNumber: p.deedNumber,
      deedDate: p.deedDate,
      deedAuthority: p.deedAuthority,
      deedDocumentUrl: p.deedDocumentUrl,
      sitePlanDocumentUrl: p.sitePlanDocumentUrl,
      buildingPermitUrl: p.buildingPermitUrl,
      electricityBillUrl: p.electricityBillUrl,
      waterBillUrl: p.waterBillUrl,
      ownerIdDocumentUrl: p.ownerIdDocumentUrl,
      
      // Step 2: Technical Specification
      propertyTypeDetailed: p.propertyTypeDetailed,
      landArea: p.landArea,
      builtArea: p.builtArea,
      buildingAge: p.buildingAge,
      floorsCount: p.floorsCount,
      unitsCount: p.unitsCount,
      propertyCondition: p.propertyCondition,
      gpsLatitude: p.gpsLatitude,
      gpsLongitude: p.gpsLongitude,
      city: p.city,
      district: p.district,
      municipality: p.municipality,
      propertyDescription: p.propertyDescription,
      mainImagesUrls: p.mainImagesUrls || [],
      
      // Step 3: Financial & Tokenization
      marketValue: p.marketValue,
      valuationReportUrl: p.valuationReportUrl,
      ownerRetainedPercentage: p.ownerRetainedPercentage,
      payoutSchedule: p.payoutSchedule,
      
      // Step 4: Owner Information
      ownerType: p.ownerType,
      nationalIdOrCR: p.nationalIdOrCR,
      ownerPhone: p.ownerPhone,
      ownerEmail: p.ownerEmail,
      ownerIban: p.ownerIban,
      authorizedPersonName: p.authorizedPersonName,
      authorizedPersonId: p.authorizedPersonId,
      commercialRegistration: p.commercialRegistration,
      
      // Step 5: Compliance
      declarationPropertyAccuracy: p.declarationPropertyAccuracy,
      declarationLegalResponsibility: p.declarationLegalResponsibility,
      declarationTokenizationApproval: p.declarationTokenizationApproval,
      declarationDocumentSharingApproval: p.declarationDocumentSharingApproval,
      
      // Metadata
      isDraft: p.isDraft,
      submissionCompletedAt: p.submissionCompletedAt
    }))
    res.json(mapped)
  } catch (e) {
        console.error('List properties error:', e)
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
    
    // Map to frontend format with ALL fields
    const mapped = {
      // Basic fields
      id: property.id,
      name: property.title,
      title: property.title,
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
      
      // Step 1: Legal Verification
      ownershipType: property.ownershipType,
      deedNumber: property.deedNumber,
      deedDate: property.deedDate,
      deedAuthority: property.deedAuthority,
      deedDocumentUrl: property.deedDocumentUrl,
      sitePlanDocumentUrl: property.sitePlanDocumentUrl,
      buildingPermitUrl: property.buildingPermitUrl,
      electricityBillUrl: property.electricityBillUrl,
      waterBillUrl: property.waterBillUrl,
      ownerIdDocumentUrl: property.ownerIdDocumentUrl,
      
      // Step 2: Technical Specification
      propertyTypeDetailed: property.propertyTypeDetailed,
      landArea: property.landArea,
      builtArea: property.builtArea,
      buildingAge: property.buildingAge,
      floorsCount: property.floorsCount,
      unitsCount: property.unitsCount,
      propertyCondition: property.propertyCondition,
      gpsLatitude: property.gpsLatitude,
      gpsLongitude: property.gpsLongitude,
      city: property.city,
      district: property.district,
      municipality: property.municipality,
      propertyDescription: property.propertyDescription,
      mainImagesUrls: property.mainImagesUrls || [],
      
      // Step 3: Financial & Tokenization
      marketValue: property.marketValue,
      valuationReportUrl: property.valuationReportUrl,
      ownerRetainedPercentage: property.ownerRetainedPercentage,
      payoutSchedule: property.payoutSchedule,
      
      // Step 4: Owner Information
      ownerType: property.ownerType,
      nationalIdOrCR: property.nationalIdOrCR,
      ownerPhone: property.ownerPhone,
      ownerEmail: property.ownerEmail,
      ownerIban: property.ownerIban,
      authorizedPersonName: property.authorizedPersonName,
      authorizedPersonId: property.authorizedPersonId,
      commercialRegistration: property.commercialRegistration,
      
      // Step 5: Compliance
      declarationPropertyAccuracy: property.declarationPropertyAccuracy,
      declarationLegalResponsibility: property.declarationLegalResponsibility,
      declarationTokenizationApproval: property.declarationTokenizationApproval,
      declarationDocumentSharingApproval: property.declarationDocumentSharingApproval,
      
      // Metadata
      isDraft: property.isDraft,
      submissionCompletedAt: property.submissionCompletedAt
    }
    
    res.json(mapped)
  } catch (e) {
    console.error('Property fetch error:', e)
    res.status(500).json({ error: 'failed_to_fetch_property' })
  }
})

// ============================================================================
// DOCUMENT UPLOAD ENDPOINT
// ============================================================================

// POST /api/properties/upload-document
// Upload a single document (deed, permit, valuation report, etc.)
propertyRouter.post('/upload-document', auth(true), upload.single('file'), async (req: Request & { user?: any }, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { documentType } = req.body
    const fileUrl = getFileUrl(req.file.filename)
    
    // Calculate file hash for integrity
    const fileHash = crypto.createHash('sha256')
      .update(req.file.buffer || req.file.filename)
      .digest('hex')

    res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileHash,
      documentType,
      message: 'Document uploaded successfully'
    })
  } catch (e) {
    console.error('Document upload error:', e)
    res.status(500).json({ error: 'failed_to_upload_document' })
  }
})

// ============================================================================
// ENHANCED PROPERTY SUBMISSION ENDPOINT
// ============================================================================

// POST /api/properties/submit
// Submit complete property with all Saudi regulatory fields
propertyRouter.post('/submit', auth(true), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const authenticatedUserId = req.user?.userId
    const tenantId = req.user?.tenantId || 'default-tenant'

    const {
      // STEP 1: Legal Verification
      ownershipType,
      deedNumber,
      deedDate,
      deedAuthority,
      deedDocumentUrl,
      sitePlanDocumentUrl,
      buildingPermitUrl,
      electricityBillUrl,
      waterBillUrl,
      ownerIdDocumentUrl,

      // STEP 2: Technical Specification
      propertyType,
      landArea,
      builtArea,
      buildingAge,
      floorsCount,
      unitsCount,
      propertyCondition,
      gpsLatitude,
      gpsLongitude,
      city,
      district,
      municipality,
      propertyDescription,
      mainImagesUrls,

      // STEP 3: Financial & Tokenization
      marketValue,
      valuationReportUrl,
      totalTokens,
      tokenPrice,
      ownerRetainedPercentage,
      expectedROI,
      expectedMonthlyYield,
      payoutSchedule,

      // STEP 4: Owner Information
      ownerType,
      ownerName,
      nationalIdOrCR,
      ownerPhone,
      ownerEmail,
      ownerIban,
      authorizedPersonName,
      authorizedPersonId,
      commercialRegistration,

      // STEP 5: Compliance
      declarationPropertyAccuracy,
      declarationLegalResponsibility,
      declarationTokenizationApproval,
      declarationDocumentSharingApproval,

      // Metadata
      isDraft
    } = req.body

    // Validate required fields for non-draft submissions
    if (!isDraft) {
      validateRequired(req.body, [
        'deedNumber', 'deedDate', 'deedAuthority',
        'propertyType', 'landArea', 'builtArea',
        'totalTokens', 'tokenPrice', 'marketValue',
        'ownerName', 'nationalIdOrCR', 'ownerPhone', 'ownerEmail', 'ownerIban'
      ])

      // Validate all compliance declarations are true
      if (!declarationPropertyAccuracy || !declarationLegalResponsibility || 
          !declarationTokenizationApproval || !declarationDocumentSharingApproval) {
        return res.status(400).json({ 
          error: 'compliance_required',
          message: 'All compliance declarations must be accepted'
        })
      }
    }

    // Calculate remaining tokens based on owner retained percentage
    const totalTokensNum = Number(totalTokens)
    const ownerRetainedPct = Number(ownerRetainedPercentage || 0)
    const retainedTokens = Math.floor((totalTokensNum * ownerRetainedPct) / 100)
    const remainingTokensNum = totalTokensNum - retainedTokens

    // Create property with all fields
    const created = await prisma.property.create({
      data: {
        // Basic fields (for backward compatibility)
        title: `${propertyType} - ${city}`,
        location: `${district}, ${city}, ${municipality}`,
        description: propertyDescription || '',
        imageUrl: mainImagesUrls?.[0] || '',
        images: mainImagesUrls || [],
        totalValue: Number(marketValue),
        tokenPrice: Number(tokenPrice),
        totalTokens: totalTokensNum,
        remainingTokens: remainingTokensNum,
        monthlyYield: Number(expectedMonthlyYield || 0),
        expectedROI: Number(expectedROI || 0),
        status: isDraft ? 'PENDING' : 'PENDING',
        ownerId: authenticatedUserId,
        ownerName: ownerName || req.user?.name || '',
        tenantId,

        // STEP 1: Legal Verification
        ownershipType: ownershipType as $Enums.OwnershipType | undefined,
        deedNumber,
        deedDate: deedDate ? new Date(deedDate) : null,
        deedAuthority,
        deedDocumentUrl,
        sitePlanDocumentUrl,
        buildingPermitUrl,
        electricityBillUrl,
        waterBillUrl,
        ownerIdDocumentUrl,

        // STEP 2: Technical Specification
        propertyTypeDetailed: propertyType,
        landArea: Number(landArea),
        builtArea: Number(builtArea),
        buildingAge: Number(buildingAge || 0),
        floorsCount: Number(floorsCount || 1),
        unitsCount: Number(unitsCount || 1),
        propertyCondition: propertyCondition as $Enums.PropertyCondition | undefined,
        gpsLatitude: Number(gpsLatitude),
        gpsLongitude: Number(gpsLongitude),
        city,
        district,
        municipality,
        propertyDescription,
        mainImagesUrls: mainImagesUrls || [],

        // STEP 3: Financial & Tokenization
        marketValue: Number(marketValue),
        valuationReportUrl,
        ownerRetainedPercentage: ownerRetainedPct,
        payoutSchedule: payoutSchedule as $Enums.PayoutSchedule | undefined,

        // STEP 4: Owner Information
        ownerType: ownerType as $Enums.OwnerType | undefined,
        nationalIdOrCR,
        ownerPhone,
        ownerEmail,
        ownerIban,
        authorizedPersonName,
        authorizedPersonId,
        commercialRegistration,

        // STEP 5: Compliance
        declarationPropertyAccuracy: !!declarationPropertyAccuracy,
        declarationLegalResponsibility: !!declarationLegalResponsibility,
        declarationTokenizationApproval: !!declarationTokenizationApproval,
        declarationDocumentSharingApproval: !!declarationDocumentSharingApproval,

        // Metadata
        isDraft: !!isDraft,
        submissionCompletedAt: isDraft ? null : new Date()
      }
    })

    res.status(201).json({
      success: true,
      propertyId: created.id,
      status: created.status,
      message: isDraft 
        ? 'Property draft saved successfully'
        : 'Property submitted successfully! Awaiting admin approval.'
    })
  } catch (e) {
    console.error('Property submission error:', e)
    next(e)
  }
})

// POST /api/properties - DEPRECATED - Use /api/properties/submit instead
// This old endpoint is commented out to prevent duplicate property creation
// Body: { name, location, description, imageUrl, propertyValue, expectedROI, totalTokens, tokenPrice, ownerName }
// Files: images (multiple files)
/*
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
*/

// PATCH /api/properties/:id - Update property (generic update for admin)
propertyRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!status) {
      return res.status(400).json({ error: 'status is required' })
    }
    const allowedStatuses: $Enums.PropertyStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

if (!allowedStatuses.includes(status)) {
  return res.status(400).json({ error: 'invalid_status' })
}

  const updateData: {
  status: $Enums.PropertyStatus
  approvedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
} = { status }
    
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
          data: { blockchainTxId: tokenizeTxId }
        })
        
        // Record on-chain events for blockchain explorer
        try {
          // Use individual upserts instead of createMany with skipDuplicates (not supported on SQLite)
          const events = [
            {
              txId: registerTxId,
              type: $Enums.OnChainEventType.TOKEN_MINT,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'RegisterPropertySimple', propertyId: updated.id, title: updated.title })
            },
            {
              txId: approveTxId,
              type: $Enums.OnChainEventType.TOKEN_MINT,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'ApproveProperty', propertyId: updated.id })
            },
            {
              txId: tokenizeTxId,
              type: $Enums.OnChainEventType.TOKEN_MINT,
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
          data: { blockchainTxId: tokenizeTxId }
        })
        
        // Record on-chain events for blockchain explorer
        try {
          // Use individual upserts instead of createMany with skipDuplicates (not supported on SQLite)
          const events = [
            {
              txId: registerTxId,
              type: $Enums.OnChainEventType.TOKEN_MINT,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'RegisterPropertySimple', propertyId: updated.id, title: updated.title })
            },
            {
              txId: approveTxId,
              type: $Enums.OnChainEventType.TOKEN_MINT,
              propertyId: updated.id,
              payload: JSON.stringify({ action: 'ApproveProperty', propertyId: updated.id })
            },
            {
              txId: tokenizeTxId,
              type: $Enums.OnChainEventType.TOKEN_MINT,
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
