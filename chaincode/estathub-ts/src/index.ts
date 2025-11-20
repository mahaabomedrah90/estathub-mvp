/// <reference types="node" />
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api'

// ============================================================================
// Data Models
// ============================================================================

interface Holding {
  userId: string
  propertyId: string
  tokens: number
}

interface Property {
  propertyId: string
  title: string
  totalTokens: number
  remainingTokens: number
  totalValue: number
  tokenPrice: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'TOKENIZED'
  
  // Saudi-specific fields
  propertyUsage: 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'INDUSTRIAL' | 'MIXED'
  landType: 'URBAN' | 'RURAL' | 'DESERT' | 'COASTAL'
  municipality: string
  district: string
  landArea?: number  // sqm
  builtArea?: number // sqm
  planNumber?: string
  deedNumber?: string  // Original Ministry deed number
  coordinates?: string
  zoningClass?: string
  permitNumber?: string
  
  createdAt: string
  approvedAt?: string
  tokenizedAt?: string
}

interface DigitalDeed {
  deedNumber: string  // Unique: DEED-{year}-{seq}
  userId: string
  propertyId: string
  orderId?: string
  
  // Ownership
  ownedTokens: number
  ownershipPct: number
  
  // Deed metadata
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ISSUED' | 'REVOKED' | 'TRANSFERRED'
  deedHash?: string  // SHA-256 of PDF
  qrCodeData?: string
  
  // Timestamps
  issuedAt?: string
  expiresAt?: string
  revokedAt?: string
  revocationReason?: string
  createdAt: string
  updatedAt: string
}

interface InvestorPrivateData {
  userId: string
  nationalId: string
  fullName: string
  phoneNumber: string
  address: string
  email: string
}

// ============================================================================
// Key Generation Functions
// ============================================================================

function propKey(propertyId: string): string {
  return `prop:${propertyId}`
}

function holdKey(userId: string, propertyId: string): string {
  return `hold:${userId}:${propertyId}`
}

function deedKey(deedNumber: string): string {
  return `deed:${deedNumber}`
}

function deedByUserKey(userId: string, deedNumber: string): string {
  return `deed_user:${userId}:${deedNumber}`
}

function deedByPropertyKey(propertyId: string, deedNumber: string): string {
  return `deed_prop:${propertyId}:${deedNumber}`
}

// ============================================================================
// Saudi Digital Deed Contract (صك ملكية رقمي)
// ============================================================================

@Info({ 
  title: 'SaudiDeedContract', 
  description: 'Saudi Digital Title Deed Contract for Real Estate Tokenization' 
})
export class SaudiDeedContract extends Contract {

  // ==========================================================================
  // Property Lifecycle Management
  // ==========================================================================

  /**
   * Register a new property on the blockchain (Complex version)
   * Admin only - called after property submission
   */
  @Transaction()
  public async RegisterProperty(
    ctx: Context,
    propertyId: string,
    propertyData: string  // JSON string of Property interface
  ): Promise<string> {
    const pkey = propKey(propertyId)
    const exists = await this.exists(ctx, pkey)
    if (exists) throw new Error('property_already_exists')

    const prop: Property = JSON.parse(propertyData)
    prop.propertyId = propertyId
    prop.status = 'PENDING'
    prop.createdAt = new Date().toISOString()

    await ctx.stub.putState(pkey, Buffer.from(JSON.stringify(prop)))
    await ctx.stub.setEvent('PropertyRegistered', Buffer.from(JSON.stringify({ propertyId })))
    return JSON.stringify(prop)
  }

  /**
   * Register a new property on the blockchain (Simplified version)
   * Admin only - called after property approval
   */
  @Transaction()
  public async RegisterPropertySimple(
    ctx: Context,
    id: string,
    title: string,
    location: string,
    tokens: string
  ): Promise<string> {
    const pkey = propKey(id)  // Use "prop:{id}" format
    const exists = await ctx.stub.getState(pkey)
    if (exists && exists.length > 0) throw new Error(`Property ${id} already exists`)
    
    const property = {
      propertyId: id,  // Match Property interface
      title,
      location,
      totalTokens: parseInt(tokens),
      remainingTokens: parseInt(tokens),
      status: 'APPROVED' as const,
      createdAt: new Date().toISOString()
    }
    
    await ctx.stub.putState(pkey, Buffer.from(JSON.stringify(property)))
    ctx.stub.setEvent('PropertyRegistered', Buffer.from(JSON.stringify(property)))
    return JSON.stringify(property)
  }

  /**
   * Record an investment in a property
   * Called after payment confirmation
   */
  @Transaction()
  public async InvestProperty(
    ctx: Context,
    propertyId: string,
    investorEmail: string,
    tokens: string
  ): Promise<string> {
    const propertyBytes = await ctx.stub.getState(propertyId)
    if (!propertyBytes || propertyBytes.length === 0) throw new Error('property_not_found')
    
    const holdingId = `HOLD-${propertyId}-${investorEmail}`
    const holding = {
      holdingId,
      propertyId,
      investorEmail,
      tokens,
      type: 'Holding',
      timestamp: new Date().toISOString()
    }
    
    await ctx.stub.putState(holdingId, Buffer.from(JSON.stringify(holding)))
    ctx.stub.setEvent('InvestmentRecorded', Buffer.from(JSON.stringify(holding)))
    return JSON.stringify(holding)
  }

  /**
   * Approve property for tokenization
   * Admin only
   */
  @Transaction()
  public async ApproveProperty(ctx: Context, propertyId: string): Promise<void> {
    const prop = await this.getProperty(ctx, propertyId)
    if (prop.status !== 'PENDING') throw new Error('property_not_pending')

    prop.status = 'APPROVED'
    prop.approvedAt = new Date().toISOString()

    await ctx.stub.putState(propKey(propertyId), Buffer.from(JSON.stringify(prop)))
    await ctx.stub.setEvent('PropertyApproved', Buffer.from(JSON.stringify({ propertyId })))
  }

  /**
   * Tokenize approved property (make it available for investment)
   * Admin only
   */
  @Transaction()
  public async TokenizeProperty(ctx: Context, propertyId: string): Promise<void> {
    const prop = await this.getProperty(ctx, propertyId)
    if (prop.status !== 'APPROVED') throw new Error('property_not_approved')

    prop.status = 'TOKENIZED'
    prop.tokenizedAt = new Date().toISOString()

    await ctx.stub.putState(propKey(propertyId), Buffer.from(JSON.stringify(prop)))
    await ctx.stub.setEvent('PropertyTokenized', Buffer.from(JSON.stringify({ propertyId })))
  }

  // ==========================================================================
  // Token Minting & Holdings
  // ==========================================================================

  /**
   * Mint tokens to an investor (after payment)
   * Creates/updates holding balance
   */
  @Transaction()
  public async MintTokens(
    ctx: Context,
    propertyId: string,
    userId: string,
    tokens: string,
    orderId: string
  ): Promise<void> {
    const qty = Number(tokens)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('invalid_tokens')

    const prop = await this.getProperty(ctx, propertyId)
    if (prop.status !== 'TOKENIZED') throw new Error('property_not_tokenized')
    if (prop.remainingTokens < qty) throw new Error('insufficient_remaining_tokens')

    // Update property remaining tokens
    prop.remainingTokens -= qty
    await ctx.stub.putState(propKey(propertyId), Buffer.from(JSON.stringify(prop)))

    // Update or create holding
    const hkey = holdKey(userId, propertyId)
    const hbuf = await ctx.stub.getState(hkey)
    let bal = 0
    if (hbuf && hbuf.length) {
      const holding = JSON.parse(hbuf.toString()) as Holding
      bal = holding.tokens
    }
    const updated: Holding = { userId, propertyId, tokens: bal + qty }
    await ctx.stub.putState(hkey, Buffer.from(JSON.stringify(updated)))

    await ctx.stub.setEvent('TokenMinted', Buffer.from(JSON.stringify({
      propertyId,
      userId,
      tokens: qty,
      orderId,
      timestamp: new Date().toISOString()
    })))
  }

  /**
   * Transfer tokens between investors
   */
  @Transaction()
  public async TransferTokens(
    ctx: Context,
    propertyId: string,
    fromUserId: string,
    toUserId: string,
    tokens: string
  ): Promise<void> {
    const qty = Number(tokens)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('invalid_tokens')

    const fromKey = holdKey(fromUserId, propertyId)
    const toKey = holdKey(toUserId, propertyId)

    const fbuf = await ctx.stub.getState(fromKey)
    if (!fbuf || fbuf.length === 0) throw new Error('from_holding_not_found')
    const fhold = JSON.parse(fbuf.toString()) as Holding
    if ((fhold.tokens || 0) < qty) throw new Error('insufficient_balance')

    const tbuf = await ctx.stub.getState(toKey)
    const thold = tbuf && tbuf.length
      ? (JSON.parse(tbuf.toString()) as Holding)
      : { userId: toUserId, propertyId, tokens: 0 }

    fhold.tokens -= qty
    thold.tokens += qty

    await ctx.stub.putState(fromKey, Buffer.from(JSON.stringify(fhold)))
    await ctx.stub.putState(toKey, Buffer.from(JSON.stringify(thold)))

    await ctx.stub.setEvent('TokenTransferred', Buffer.from(JSON.stringify({
      propertyId,
      fromUserId,
      toUserId,
      tokens: qty,
      timestamp: new Date().toISOString()
    })))
  }

  // ==========================================================================
  // Digital Deed Issuance (صك ملكية رقمي)
  // ==========================================================================

  /**
   * Issue a digital deed to an investor
   * Called after tokens are minted and PDF is generated
   */
  @Transaction()
  public async IssueDeed(
    ctx: Context,
    deedNumber: string,
    userId: string,
    propertyId: string,
    ownedTokens: string,
    deedHash: string,
    qrCodeData: string,
    orderId?: string
  ): Promise<void> {
    // Validate deed doesn't exist
    const dkey = deedKey(deedNumber)
    const exists = await this.exists(ctx, dkey)
    if (exists) throw new Error('deed_already_exists')

    // Validate property exists and get total tokens
    const prop = await this.getProperty(ctx, propertyId)
    const tokens = Number(ownedTokens)
    const ownershipPct = (tokens / prop.totalTokens) * 100

    // Create deed
    const deed: DigitalDeed = {
      deedNumber,
      userId,
      propertyId,
      orderId,
      ownedTokens: tokens,
      ownershipPct,
      status: 'ISSUED',
      deedHash,
      qrCodeData,
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Store deed with multiple composite keys for efficient querying
    await ctx.stub.putState(dkey, Buffer.from(JSON.stringify(deed)))
    await ctx.stub.putState(deedByUserKey(userId, deedNumber), Buffer.from(deedNumber))
    await ctx.stub.putState(deedByPropertyKey(propertyId, deedNumber), Buffer.from(deedNumber))

    await ctx.stub.setEvent('DeedIssued', Buffer.from(JSON.stringify({
      deedNumber,
      userId,
      propertyId,
      ownedTokens: tokens,
      ownershipPct,
      timestamp: new Date().toISOString()
    })))
  }

  /**
   * Revoke a deed (admin only)
   */
  @Transaction()
  public async RevokeDeed(
    ctx: Context,
    deedNumber: string,
    reason: string
  ): Promise<void> {
    const deed = await this.getDeed(ctx, deedNumber)
    if (deed.status === 'REVOKED') throw new Error('deed_already_revoked')

    deed.status = 'REVOKED'
    deed.revokedAt = new Date().toISOString()
    deed.revocationReason = reason
    deed.updatedAt = new Date().toISOString()

    await ctx.stub.putState(deedKey(deedNumber), Buffer.from(JSON.stringify(deed)))
    await ctx.stub.setEvent('DeedRevoked', Buffer.from(JSON.stringify({
      deedNumber,
      reason,
      timestamp: new Date().toISOString()
    })))
  }

  /**
   * Update deed after transfer (when tokens are transferred)
   */
  @Transaction()
  public async TransferDeed(
    ctx: Context,
    deedNumber: string,
    newUserId: string,
    newDeedHash: string,
    newQrCodeData: string
  ): Promise<void> {
    const deed = await this.getDeed(ctx, deedNumber)
    if (deed.status !== 'ISSUED') throw new Error('deed_not_transferable')

    const oldUserId = deed.userId

    // Update deed
    deed.userId = newUserId
    deed.status = 'TRANSFERRED'
    deed.deedHash = newDeedHash
    deed.qrCodeData = newQrCodeData
    deed.updatedAt = new Date().toISOString()

    // Update composite keys
    await ctx.stub.deleteState(deedByUserKey(oldUserId, deedNumber))
    await ctx.stub.putState(deedByUserKey(newUserId, deedNumber), Buffer.from(deedNumber))
    await ctx.stub.putState(deedKey(deedNumber), Buffer.from(JSON.stringify(deed)))

    await ctx.stub.setEvent('DeedTransferred', Buffer.from(JSON.stringify({
      deedNumber,
      fromUserId: oldUserId,
      toUserId: newUserId,
      timestamp: new Date().toISOString()
    })))
  }

  // ==========================================================================
  // Private Data Collection (PDC) for Investor PII
  // ==========================================================================

  /**
   * Store investor private data in PDC
   * Collection name: deedPDC
   */
  @Transaction()
  public async StoreInvestorPrivateData(
    ctx: Context,
    userId: string,
    privateDataJson: string
  ): Promise<void> {
    const privateData: InvestorPrivateData = JSON.parse(privateDataJson)
    privateData.userId = userId

    // Store in private data collection
    await ctx.stub.putPrivateData(
      'deedPDC',
      `investor:${userId}`,
      Buffer.from(JSON.stringify(privateData))
    )
  }

  /**
   * Retrieve investor private data from PDC
   * Only authorized orgs can access
   */
  @Transaction(false)
  public async GetInvestorPrivateData(
    ctx: Context,
    userId: string
  ): Promise<string> {
    const data = await ctx.stub.getPrivateData('deedPDC', `investor:${userId}`)
    if (!data || data.length === 0) throw new Error('private_data_not_found')
    return data.toString()
  }

  // ==========================================================================
  // Query Functions
  // ==========================================================================

  /**
   * Get property details
   */
  @Transaction(false)
  @Returns('string')
  public async GetProperty(ctx: Context, propertyId: string): Promise<string> {
    const prop = await this.getProperty(ctx, propertyId)
    return JSON.stringify(prop)
  }

  /**
   * Get deed details
   */
  @Transaction(false)
  @Returns('string')
  public async GetDeed(ctx: Context, deedNumber: string): Promise<string> {
    const deed = await this.getDeed(ctx, deedNumber)
    return JSON.stringify(deed)
  }

  /**
   * Verify deed by hash (for QR code verification)
   */
  @Transaction(false)
  @Returns('string')
  public async VerifyDeedHash(
    ctx: Context,
    deedNumber: string,
    providedHash: string
  ): Promise<string> {
    const deed = await this.getDeed(ctx, deedNumber)
    
    const isValid = deed.deedHash === providedHash && deed.status === 'ISSUED'
    
    return JSON.stringify({
      valid: isValid,
      deedNumber: deed.deedNumber,
      status: deed.status,
      userId: deed.userId,
      propertyId: deed.propertyId,
      ownedTokens: deed.ownedTokens,
      ownershipPct: deed.ownershipPct,
      issuedAt: deed.issuedAt
    })
  }

  /**
   * Get all deeds for a user
   */
  @Transaction(false)
  @Returns('string')
  public async GetDeedsByUser(ctx: Context, userId: string): Promise<string> {
    const results: DigitalDeed[] = []
    const startKey = `deed_user:${userId}:`
    const endKey = `deed_user:${userId};`
    const iterator = await ctx.stub.getStateByRange(startKey, endKey)

    try {
      while (true) {
        const res = await iterator.next()
        if (res.done) break

        if (res.value && res.value.value) {
          const deedNumber = res.value.value.toString()
          const deed = await this.getDeed(ctx, deedNumber)
          results.push(deed)
        }
      }
    } finally {
      await iterator.close()
    }

    return JSON.stringify(results)
  }

  /**
   * Get all deeds for a property
   */
  @Transaction(false)
  @Returns('string')
  public async GetDeedsByProperty(ctx: Context, propertyId: string): Promise<string> {
    const results: DigitalDeed[] = []
    const startKey = `deed_prop:${propertyId}:`
    const endKey = `deed_prop:${propertyId};`
    const iterator = await ctx.stub.getStateByRange(startKey, endKey)

    try {
      while (true) {
        const res = await iterator.next()
        if (res.done) break

        if (res.value && res.value.value) {
          const deedNumber = res.value.value.toString()
          const deed = await this.getDeed(ctx, deedNumber)
          results.push(deed)
        }
      }
    } finally {
      await iterator.close()
    }

    return JSON.stringify(results)
  }

  /**
   * Get investor balance for a property
   */
  @Transaction(false)
  @Returns('number')
  public async GetBalance(
    ctx: Context,
    userId: string,
    propertyId: string
  ): Promise<number> {
    const hkey = holdKey(userId, propertyId)
    const hbuf = await ctx.stub.getState(hkey)
    if (!hbuf || hbuf.length === 0) return 0
    const holding = JSON.parse(hbuf.toString()) as Holding
    return holding.tokens || 0
  }

  /**
   * Get all holdings for a user
   */
  @Transaction(false)
  @Returns('string')
  public async GetHoldings(ctx: Context, userId: string): Promise<string> {
    const results: Array<{ propertyId: string; tokens: number }> = []
    const startKey = `hold:${userId}:`
    const endKey = `hold:${userId};`
    const iterator = await ctx.stub.getStateByRange(startKey, endKey)

    try {
      while (true) {
        const res = await iterator.next()
        if (res.done) break

        if (res.value && res.value.value) {
          const obj = JSON.parse(res.value.value.toString()) as Holding
          results.push({ propertyId: obj.propertyId, tokens: obj.tokens || 0 })
        }
      }
    } finally {
      await iterator.close()
    }

    return JSON.stringify(results)
  }

  /**
   * Get all properties from the blockchain
   * Returns array of all registered properties
   */
  @Transaction(false)
  @Returns('string')
  public async GetAllProperties(ctx: Context): Promise<string> {
    const results: Property[] = []
    const startKey = 'prop:'
    const endKey = 'prop;'
    const iterator = await ctx.stub.getStateByRange(startKey, endKey)

    try {
      while (true) {
        const res = await iterator.next()
        if (res.done) break

        if (res.value && res.value.value) {
          const prop = JSON.parse(res.value.value.toString()) as Property
          results.push(prop)
        }
      }
    } finally {
      await iterator.close()
    }

    return JSON.stringify(results)
  }

  /**
   * Get all digital deeds from the blockchain
   * Returns array of all issued deeds
   */
  @Transaction(false)
  @Returns('string')
  public async GetAllDeeds(ctx: Context): Promise<string> {
    const results: DigitalDeed[] = []
    const startKey = 'deed:'
    const endKey = 'deed;'
    const iterator = await ctx.stub.getStateByRange(startKey, endKey)

    try {
      while (true) {
        const res = await iterator.next()
        if (res.done) break

        if (res.value && res.value.value) {
          const deed = JSON.parse(res.value.value.toString()) as DigitalDeed
          results.push(deed)
        }
      }
    } finally {
      await iterator.close()
    }

    return JSON.stringify(results)
  }

  /**
   * Get transaction history from blockchain events
   * Returns recent blockchain events with transaction IDs
   */
  @Transaction(false)
  @Returns('string')
  public async GetTransactionHistory(ctx: Context, limit?: string): Promise<string> {
    const maxResults = limit ? parseInt(limit) : 100
    const results: any[] = []
    
    // Query all state changes to get transaction history
    const iterator = await ctx.stub.getHistoryForKey('tx_counter')
    
    try {
      let count = 0
      while (count < maxResults) {
        const res = await iterator.next()
        if (res.done) break

        if (res.value) {
          results.push({
            txId: res.value.txId,
            timestamp: res.value.timestamp,
            isDelete: res.value.isDelete,
            value: res.value.value?.toString()
          })
          count++
        }
      }
    } finally {
      await iterator.close()
    }

    return JSON.stringify(results)
  }

  /**
   * Get all holdings across all users (admin view)
   * Returns complete holdings ledger
   */
  @Transaction(false)
  @Returns('string')
  public async GetAllHoldings(ctx: Context): Promise<string> {
    const results: Holding[] = []
    const startKey = 'hold:'
    const endKey = 'hold;'
    const iterator = await ctx.stub.getStateByRange(startKey, endKey)

    try {
      while (true) {
        const res = await iterator.next()
        if (res.done) break

        if (res.value && res.value.value) {
          const holding = JSON.parse(res.value.value.toString()) as Holding
          results.push(holding)
        }
      }
    } finally {
      await iterator.close()
    }

    return JSON.stringify(results)
  }

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  private async exists(ctx: Context, key: string): Promise<boolean> {
    const data = await ctx.stub.getState(key)
    return !!(data && data.length)
  }

  private async getProperty(ctx: Context, propertyId: string): Promise<Property> {
    const pbuf = await ctx.stub.getState(propKey(propertyId))
    if (!pbuf || pbuf.length === 0) throw new Error('property_not_found')
    return JSON.parse(pbuf.toString()) as Property
  }

  private async getDeed(ctx: Context, deedNumber: string): Promise<DigitalDeed> {
    const dbuf = await ctx.stub.getState(deedKey(deedNumber))
    if (!dbuf || dbuf.length === 0) throw new Error('deed_not_found')
    return JSON.parse(dbuf.toString()) as DigitalDeed
  }
}

// Export for Fabric
export const contracts: any[] = [SaudiDeedContract]
