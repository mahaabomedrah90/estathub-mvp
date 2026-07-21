import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { submitInitProperty, submitTxn, isFabricEnabled } from '../lib/fabric'
import { uploadMultiplePropertyImages, getFileUrl, errorHandler, validateRequired, throwApiError, requireRole } from '../middleware/roles'
import { auth } from '../middleware/auth'
import { getSignedPropertyLeadUrl, isS3Key, isLegacyLocalUrl } from '../lib/propertyLeadS3'
import { getSetting } from './settings.controller'
import { buildPropertyFeeSnapshot } from '../lib/fees'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'

export const propertyRouter = Router()

// Resolve stored property image refs to browser-usable URLs for PUBLIC responses.
// - Private S3 keys ("property-leads/…", produced by converting a PropertyLead)
//   → short-lived pre-signed GET URLs, but ONLY when the property is publicly
//   visible (allowSignedS3 = status === 'APPROVED'). For PENDING/other statuses
//   the key is skipped entirely — never signed, never returned — so private
//   marketing photos of non-approved properties are not exposed via the public API.
// - Public/legacy URLs (absolute http(s), legacy "/api/uploads/…") → passed
//   through unchanged (already public) so existing wizard-submitted images work.
// - Junk refs — "[object Object]" (from an earlier String(obj) bug), empties,
//   and any string that is neither an S3 key nor a URL → dropped.
// Only marketing photos (mainImagesUrls) are ever passed here — deed/legal
// documents are NEVER signed for public property responses.
async function resolvePropertyImageUrls(refs: unknown, allowSignedS3: boolean): Promise<string[]> {
  if (!Array.isArray(refs)) return []
  const out: string[] = []
  for (const ref of refs) {
    if (typeof ref !== 'string') continue
    const r = ref.trim()
    if (!r || r === '[object Object]') continue
    if (isS3Key(r)) {
      if (!allowSignedS3) continue
      try {
        out.push(await getSignedPropertyLeadUrl(r))
      } catch {
        // Skip keys we cannot sign (e.g. bucket not configured); never leak a raw key.
      }
    } else if (/^https?:\/\//.test(r) || isLegacyLocalUrl(r)) {
      out.push(r)
    }
    // else: not a key, not a URL → junk, dropped.
  }
  return out
}

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

// GET /api/properties?status=APPROVED&page=1&limit=20&sort=id_desc
// Backward-compatible: no page/limit params → returns plain array (old behavior)
// With page/limit params → returns { success, data, pagination }
propertyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query
    const where = status ? { status: status as any } : {}

    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const skip  = (page - 1) * limit

    const sortParam = String(req.query.sort || 'id_desc')
    const orderBy: any = sortParam === 'createdAt_asc'  ? { createdAt: 'asc' }
      : sortParam === 'createdAt_desc' ? { createdAt: 'desc' }
      : { id: 'desc' }

    const [total, list] = hasPagination
      ? await Promise.all([
          prisma.property.count({ where }),
          prisma.property.findMany({ where, orderBy, skip, take: limit }),
        ])
      : [0, await prisma.property.findMany({ where, orderBy: { id: 'desc' } })]
    
    const mapped = await Promise.all(list.map(async (p: any) => {
      const resolvedMainImages = await resolvePropertyImageUrls(p.mainImagesUrls, p.status === 'APPROVED')
      return {
      // Basic fields
      id: p.id,
      name: p.title,
      title: p.title,
      location: p.location,
      description: p.description,
      imageUrl: p.imageUrl || resolvedMainImages[0] || null,
      images: (Array.isArray(p.images) && p.images.length) ? p.images : resolvedMainImages,
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
      // ownerIdDocumentUrl omitted — PII (national ID scan)

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
      mainImagesUrls: resolvedMainImages,
      
      // Step 3: Financial & Tokenization
      marketValue: p.marketValue,
      valuationReportUrl: p.valuationReportUrl,
      ownerRetainedPercentage: p.ownerRetainedPercentage,
      payoutSchedule: p.payoutSchedule,
      
      // Step 4: Owner Information (PII fields excluded from public response)
      ownerType: p.ownerType,
      authorizedPersonName: p.authorizedPersonName,

      // Step 5: Compliance
      declarationPropertyAccuracy: p.declarationPropertyAccuracy,
      declarationLegalResponsibility: p.declarationLegalResponsibility,
      declarationTokenizationApproval: p.declarationTokenizationApproval,
      declarationDocumentSharingApproval: p.declarationDocumentSharingApproval,

      // Metadata
      isDraft: p.isDraft,
      submissionCompletedAt: p.submissionCompletedAt
      }
    }))

    if (hasPagination) {
      return res.json({
        success: true,
        data: mapped,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      })
    }
    return res.json(mapped)
  } catch (e) {
    console.error('List properties error:', e)
    return res.status(500).json({ error: 'failed_to_list_properties' })
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

    // Converted-lead properties store their marketing photos as private S3 keys
    // in mainImagesUrls; resolve them to signed URLs (APPROVED only) and derive a
    // hero imageUrl when the (legacy) single imageUrl field is empty. Private keys
    // are never signed for non-APPROVED (e.g. PENDING) properties.
    const resolvedMainImages = await resolvePropertyImageUrls(property.mainImagesUrls, property.status === 'APPROVED')

    // Map to frontend format with ALL fields
    const mapped = {
      // Basic fields
      id: property.id,
      name: property.title,
      title: property.title,
      location: property.location,
      description: property.description,
      imageUrl: property.imageUrl || resolvedMainImages[0] || null,
      images: (Array.isArray(property.images) && property.images.length) ? property.images : resolvedMainImages,
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
      // ownerIdDocumentUrl omitted — PII (national ID scan)

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
      mainImagesUrls: resolvedMainImages,
      
      // Step 3: Financial & Tokenization
      marketValue: property.marketValue,
      valuationReportUrl: property.valuationReportUrl,
      ownerRetainedPercentage: property.ownerRetainedPercentage,
      payoutSchedule: property.payoutSchedule,
      
      // Step 4: Owner Information (PII fields excluded from public response)
      ownerType: property.ownerType,
      authorizedPersonName: property.authorizedPersonName,

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
        ownershipType: ownershipType as any,
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
        propertyCondition: propertyCondition as any,
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
        payoutSchedule: payoutSchedule as any,

        // STEP 4: Owner Information
        ownerType: ownerType as any,
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
propertyRouter.patch('/:id', auth(true), requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!status) {
      return res.status(400).json({ error: 'status is required' })
    }
    const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const

if (!allowedStatuses.includes(status)) {
  return res.status(400).json({ error: 'invalid_status' })
}

  const updateData: {
  status: (typeof allowedStatuses)[number]
  approvedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
} = { status }
    
    if (status === 'APPROVED') {
      updateData.approvedAt = new Date()
      ;(updateData as any).feeSnapshot = await buildPropertyFeeSnapshot()
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
propertyRouter.put('/:id/approve', auth(true), requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const feeSnapshot = await buildPropertyFeeSnapshot()

    const updated = await prisma.property.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        feeSnapshot: feeSnapshot as any,
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
propertyRouter.put('/:id/reject', auth(true), requireRole(['ADMIN']), async (req: Request, res: Response) => {
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
propertyRouter.get('/:id/holdings', auth(true), requireRole(['ADMIN', 'REGULATOR']), async (req: Request, res: Response) => {
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
            fullName: true,
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
    const mapped = holdings.map((h: any) => ({

      id: h.id,
      userId: h.userId,
      userEmail: h.user.email,
      userName: h.user.fullName || h.user.email,
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
