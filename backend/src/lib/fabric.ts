import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as crypto from 'crypto'
import { 
  Gateway, 
  Contract, 
  Identity, 
  Signer, 
  signers, 
  connect 
} from '@hyperledger/fabric-gateway'

// ============================================================================
// Types
// ============================================================================

export interface AuthTokenPayload {
  userId: string
  tenantId: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthUser {
  id: string
  email: string
  name?: string
  role: Role
  tenantId: string
  tenant: {
    id: string
    name: string
  }
}

export interface SignupRequest {
  email: string
  password: string
  name?: string
  tenantName?: string
  role?: Role
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1d'
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')

// ============================================================================
// Password Functions
// ============================================================================

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }
  return await bcrypt.hash(plain, BCRYPT_SALT_ROUNDS)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  return await bcrypt.compare(plain, hash)
}

// ============================================================================
// JWT Functions
// ============================================================================

export function generateJwt(payload: {
  userId: string
  tenantId: string
  role: string
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'estathub-mvp',
    audience: 'estathub-users'
  })
}

export function verifyJwt(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'estathub-mvp',
      audience: 'estathub-users'
    }) as AuthTokenPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token')
    } else {
      throw new Error('Token verification failed')
    }
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}

// ============================================================================
// Validation Functions
// ============================================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  if (!password) {
    errors.push('Password is required')
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number')
    }
  }
  return { valid: errors.length === 0, errors }
}

export function validateTenantName(name: string): boolean {
  return Boolean(name && name.trim().length >= 2 && name.trim().length <= 100)
}

// ============================================================================
// User Creation Helpers
// ============================================================================

export function generateDisplayName(email: string): string {
  const parts = email.split('@')
  const name = parts[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
  return name
}

export function sanitizeSignupInput(data: SignupRequest): {
  valid: boolean
  errors: string[]
  sanitized: SignupRequest
} {
  const errors: string[] = []
  const sanitized: SignupRequest = {
    email: data.email?.toLowerCase().trim() || '',
    password: data.password || '',
    name: data.name?.trim() || undefined,
    tenantName: data.tenantName?.trim() || undefined,
    role: data.role || Role.INVESTOR
  }
  
  if (!sanitized.email) {
    errors.push('Email is required')
  } else if (!validateEmail(sanitized.email)) {
    errors.push('Invalid email format')
  }
  
  const passwordValidation = validatePassword(sanitized.password)
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors)
  }
  
  if (sanitized.tenantName && !validateTenantName(sanitized.tenantName)) {
    errors.push('Tenant name must be between 2 and 100 characters')
  }
  
  if (sanitized.role && !Object.values(Role).includes(sanitized.role)) {
    errors.push('Invalid user role')
  }
  
  return { valid: errors.length === 0, errors, sanitized }
}

// ============================================================================
// Security Utilities
// ============================================================================

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function isJwtConfigSecure(): boolean {
  return JWT_SECRET !== 'dev-secret-change-in-production' && JWT_SECRET.length >= 32
}

export function getSecurityWarnings(): string[] {
  const warnings: string[] = []
  if (JWT_SECRET === 'dev-secret-change-in-production') {
    warnings.push('⚠️ Using default JWT secret. Set JWT_SECRET in production.')
  }
  if (JWT_SECRET.length < 32) {
    warnings.push('⚠️ JWT secret should be at least 32 characters long.')
  }
  if (BCRYPT_SALT_ROUNDS < 10) {
    warnings.push('⚠️ Bcrypt salt rounds should be at least 10 for security.')
  }
  return warnings
}

export default {
  hashPassword,
  comparePassword,
  generateJwt,
  verifyJwt,
  extractTokenFromHeader,
  validateEmail,
  validatePassword,
  validateTenantName,
  generateDisplayName,
  sanitizeSignupInput,
  generateSecureToken,
  isJwtConfigSecure,
  getSecurityWarnings,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  BCRYPT_SALT_ROUNDS
}

const USE_FABRIC = String(process.env.USE_FABRIC || '').toLowerCase() === 'true'

// ============================================================================
// Types
// ============================================================================

export interface PropertyData {
  propertyId: string
  title: string
  totalTokens: number
  remainingTokens: number
  totalValue: number 
  tokenPrice: number
  propertyUsage: 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'INDUSTRIAL' | 'MIXED'
  landType: 'URBAN' | 'RURAL' | 'DESERT' | 'COASTAL'
  municipality: string
  district: string
  landArea?: number
  builtArea?: number
  planNumber?: string
  deedNumber?: string
  coordinates?: string
  zoningClass?: string
  permitNumber?: string
}

export interface DigitalDeed {
  deedNumber: string
  userId: string
  propertyId: string
  orderId?: string
  ownedTokens: number
  ownershipPct: number
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ISSUED' | 'REVOKED' | 'TRANSFERRED'
  deedHash?: string
  qrCodeData?: string
  issuedAt?: string
  expiresAt?: string
  revokedAt?: string
  revocationReason?: string
  createdAt: string
  updatedAt: string
}

export interface InvestorPrivateData {
  userId: string
  nationalId: string
  fullName: string
  phoneNumber: string
  address: string
  email: string
}

// Legacy types for backward compatibility
export type InitPropertyArgs = { propertyId: number; totalTokens: number }
export type MintArgs = { propertyId: number; userId: number; tokens: number; orderId?: string }
export type TransferArgs = { propertyId: number; fromUserId: number; toUserId: number; tokens: number }

// ============================================================================
// Gateway Connection (Fabric Gateway SDK)
// ============================================================================

let gatewayInstance: Gateway | null = null
let contractInstance: Contract | null = null

async function newGrpcConnection(): Promise<grpc.Client> {
  const peerEndpoint = process.env.FABRIC_PEER || 'localhost:7051'
  const tlsCertPath = process.env.FABRIC_TLS_CERT || ''
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  if (!tlsCertPath) {
    throw new Error('FABRIC_TLS_CERT not configured')
  }
  
  if (!fs.existsSync(tlsCertPath)) {
    throw new Error(`TLS cert not found at: ${tlsCertPath}`)
  }
  
  const tlsRootCert = fs.readFileSync(tlsCertPath)
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert)
  
  if (debug) {
    console.log(`🔐 Creating gRPC connection to ${peerEndpoint}`)
  }
  
  return new grpc.Client(peerEndpoint, tlsCredentials, {
    'grpc.ssl_target_name_override': 'peer0.org1.example.com',
  })
}

async function newIdentity(): Promise<Identity> {
  const walletPath = process.env.FABRIC_WALLET || './fabric/wallet'
 const userId = process.env.FABRIC_USER_ID || 'appUser'
  const mspId = process.env.FABRIC_MSP || 'Org1MSP'
  const debug = process.env.FABRIC_DEBUG === 'true'
  // Try wallet-based authentication first
 if (fs.existsSync(walletPath)) {
//  try {
//  const wallet = await Wallets.newFileSystemWallet(walletPath)
//  const identity = await wallet.get(userId)
//  if (identity) {
//  if (debug) {
//  console.log(`👤 Loading identity '${userId}' from wallet ${walletPath} (MSP: ${mspId})`)
//  }
//  return {
//  mspId,
//  credentials: identity.credentials,
//  }
//  }
//  } catch (error) {
//  console.warn('⚠️ Wallet authentication failed, falling back to certificate files')
//  }
//  }
 }
 // Fallback to certificate files
 const certPath = process.env.FABRIC_IDENTITY_CERT || ''
  if (!certPath) {
    throw new Error('FABRIC_IDENTITY_CERT not configured and wallet authentication failed')
  }
  
  if (!fs.existsSync(certPath)) {
    throw new Error(`Identity cert not found at: ${certPath}`)
  }
  
  const credentials = fs.readFileSync(certPath)
  
  if (debug) {
    console.log(`👤 Loading identity from ${certPath} (MSP: ${mspId})`)
  }
  
  return {
    mspId,
    credentials,
  }
}

async function newSigner(): Promise<Signer> {
  const keyPath = process.env.FABRIC_PRIVATE_KEY || ''
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  if (!keyPath) {
    throw new Error('FABRIC_PRIVATE_KEY not configured')
  }
  
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Private key not found at: ${keyPath}`)
  }
  
  const privateKeyPem = fs.readFileSync(keyPath)
  const privateKey = crypto.createPrivateKey(privateKeyPem)
  
  if (debug) {
    console.log(`� Loading private key from ${keyPath}`)
  }
  
  return signers.newPrivateKeySigner(privateKey)
}

async function getGateway(): Promise<Gateway> {
  if (gatewayInstance) {
    return gatewayInstance
  }
  
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  if (debug) {
    console.log('🚀 Initializing Fabric Gateway SDK connection...')
  }
  
  const client = await newGrpcConnection()
  const identity = await newIdentity()
  const signer = await newSigner()
  
  gatewayInstance = connect({
    client,
    identity,
    signer,
    evaluateOptions: () => {
      return { deadline: Date.now() + 5000 } // 5 seconds
    },
    endorseOptions: () => {
      return { deadline: Date.now() + 15000 } // 15 seconds
    },
    submitOptions: () => {
      return { deadline: Date.now() + 5000 } // 5 seconds
    },
    commitStatusOptions: () => {
      return { deadline: Date.now() + 60000 } // 1 minute
    },
  })
  
  if (debug) {
    console.log('✅ Gateway connected successfully')
  }
  
  return gatewayInstance
}

async function getContract(): Promise<Contract> {
  if (contractInstance) {
    return contractInstance
  }
  
  const gateway = await getGateway()
  const channelName = process.env.FABRIC_CHANNEL || 'mychannel'
  const chaincodeName = process.env.FABRIC_CHAINCODE || 'estathub'
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  const network = gateway.getNetwork(channelName)
  contractInstance = network.getContract(chaincodeName)
  
  if (debug) {
    console.log(`📜 Contract acquired: ${chaincodeName} on ${channelName}`)
  }
  
  return contractInstance
}

export function closeGateway(): void {
  if (gatewayInstance) {
    gatewayInstance.close()
    gatewayInstance = null
    contractInstance = null
  }
}

// Legacy compatibility wrapper
async function getLegacyContract(): Promise<{ gateway: any; contract: Contract; network: any }> {
  const contract = await getContract()
  const gateway = await getGateway()
  const channelName = process.env.FABRIC_CHANNEL || 'mychannel'
  const network = gateway.getNetwork(channelName)
  
  return {
    gateway: { disconnect: () => {} }, // No-op for compatibility
    contract,
    network
  }
}

// ============================================================================
// Property Lifecycle Functions
// ============================================================================

export async function registerProperty(propertyData: PropertyData): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const result = await contract.submitAsync('RegisterProperty', {
  arguments: [propertyData.propertyId, JSON.stringify(propertyData)]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Property registered on blockchain: ${propertyData.propertyId}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function approveProperty(propertyId: string): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const result = await contract.submitAsync('ApproveProperty', {
  arguments: [propertyId]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Property approved on blockchain: ${propertyId}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function tokenizeProperty(propertyId: string): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
   const result = await contract.submitAsync('TokenizeProperty', {
  arguments: [propertyId]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Property tokenized on blockchain: ${propertyId}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function getProperty(propertyId: string): Promise<any> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetProperty', propertyId)
    const txt = Buffer.from(res).toString('utf8')
    return JSON.parse(txt)
  } finally {
    gateway.disconnect()
  }
}

// ============================================================================
// Token Management Functions
// ============================================================================

export async function mintTokens(
  propertyId: string,
  userId: string,
  tokens: number,
  orderId: string
): Promise<{ txId: string; dbTx?: any }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  
  try {
    // Submit transaction to blockchain
    const result = await contract.submitAsync('MintTokens', {
      arguments: [propertyId, userId, String(tokens), orderId]
    })
    const txId = result.getTransactionId()
    await result.getStatus()
    
    console.log(`✅ Tokens minted on Fabric: ${tokens} for user ${userId}, txId: ${txId}`)
    
    // Create database record after successful blockchain transaction
    let dbTx: any
    try {
      console.log('🔍 Attempting to create database transaction record...')
      const { prisma } = await import('../lib/prisma')
      const { TransactionType } = await import('@prisma/client')
      
      console.log('🔍 Creating transaction with data:', {
        userId: Number(userId),
        type: 'TOKEN_MINT',
        amount: tokens,
        ref: `Property ${propertyId}`,
        note: `Minted ${tokens} tokens for property ${propertyId}`,
        blockchainTxId: txId,
      })
      
      dbTx = await prisma.transaction.create({
        data: {
          userId: Number(userId),
          type: TransactionType.TOKEN_MINT,
          amount: tokens,
          ref: `Property ${propertyId}`,
          note: `Minted ${tokens} tokens for property ${propertyId}`,
          blockchainTxId: txId,
        },
      })
      
      console.log(`✅ Database transaction record created: ${dbTx.id} with blockchainTxId: ${dbTx.blockchainTxId}`)
    } catch (dbError: any) {
      console.error('⚠️ Failed to create database record:', dbError.message)
      console.error('⚠️ Full error:', dbError)
      // Continue without failing the entire operation
    }
    
    return { txId, dbTx }
  } finally {
    gateway.disconnect()
  }
}

export async function transferTokens(
  propertyId: string,
  fromUserId: string,
  toUserId: string,
  tokens: number
): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
 const { gateway, contract } = await getLegacyContract()
  try {
   const result = await contract.submitAsync('TransferTokens', {
  arguments: [propertyId, fromUserId, toUserId, String(tokens)]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Tokens transferred: ${tokens} from ${fromUserId} to ${toUserId}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function getBalance(userId: string, propertyId: string): Promise<number> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
 const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetBalance', userId, propertyId)
   const txt = Buffer.from(res).toString('utf8')
    return Number(txt)
  } finally {
    gateway.disconnect()
  }
}
export async function getHoldings(userId: string): Promise<Array<{ propertyId: string; tokens: number }>> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetHoldings', userId)
    const txt = Buffer.from(res).toString('utf8')
    const json = JSON.parse(txt)
    if (!Array.isArray(json)) return []
    return json
  } finally {
    gateway.disconnect()
  }
}

// ============================================================================
// Digital Deed Functions (صك ملكية رقمي)
// ============================================================================

export async function issueDeed(
  deedNumber: string,
  userId: string,
  propertyId: string,
  ownedTokens: number,
  deedHash: string,
  qrCodeData: string,
  orderId?: string
): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
 const { gateway, contract } = await getLegacyContract()
  try {
const result = await contract.submitAsync('IssueDeed', {
  arguments: [
    deedNumber,
    userId,
    propertyId,
    String(ownedTokens),
    deedHash,
    qrCodeData,
    orderId || ''
  ]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Digital deed issued: ${deedNumber}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function getDeed(deedNumber: string): Promise<DigitalDeed> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetDeed', deedNumber)
    const txt = Buffer.from(res).toString('utf8')
    return JSON.parse(txt)
  } finally {
    gateway.disconnect()
  }
}

export async function getDeedsByUser(userId: string): Promise<DigitalDeed[]> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  try {const { gateway, contract } = await getLegacyContract()
    const res = await contract.evaluateTransaction('GetDeedsByUser', userId)
    const txt = Buffer.from(res).toString('utf8')
    const json = JSON.parse(txt)
    if (!Array.isArray(json)) return []
    return json
  } finally {
    gateway.disconnect()
  }
}

export async function getDeedsByProperty(propertyId: string): Promise<DigitalDeed[]> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
 const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetDeedsByProperty', propertyId)
    const txt = Buffer.from(res).toString('utf8')
    const json = JSON.parse(txt)
    if (!Array.isArray(json)) return []
    return json
    
  } finally {
    gateway.disconnect()
  }
}

export async function verifyDeedHash(
  deedNumber: string,
  providedHash: string
): Promise<{
  valid: boolean
  deedNumber: string
  status: string
  userId: string
  propertyId: string
  ownedTokens: number
  ownershipPct: number
  issuedAt?: string
}> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('VerifyDeedHash', deedNumber, providedHash)
   
    const txt = Buffer.from(res).toString('utf8')
    return JSON.parse(txt)
  } finally {
    gateway.disconnect()
  }
}

export async function revokeDeed(deedNumber: string, reason: string): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
 const result = await contract.submitAsync('RevokeDeed', {
  arguments: [deedNumber, reason]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Deed revoked: ${deedNumber}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function transferDeed(
  deedNumber: string,
  newUserId: string,
  newDeedHash: string,
  newQrCodeData: string
): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
   const result = await contract.submitAsync('TransferDeed', {
  arguments: [deedNumber, newUserId, newDeedHash, newQrCodeData]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Deed transferred: ${deedNumber}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

// ============================================================================
// Private Data Collection Functions
// ============================================================================

export async function storeInvestorPrivateData(
  userId: string,
  privateData: InvestorPrivateData
): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
   const result = await contract.submitAsync('StoreInvestorPrivateData', {
  arguments: [userId, JSON.stringify(privateData)]
})
const txId = result.getTransactionId()
await result.getStatus()
    console.log(`✅ Private data stored for user: ${userId}, txId: ${txId}`)
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function getInvestorPrivateData(userId: string): Promise<InvestorPrivateData> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetInvestorPrivateData', userId)
    const txt = Buffer.from(res).toString('utf8')
    return JSON.parse(txt)
  } finally {
    gateway.disconnect()
  }
}

// ============================================================================
// Legacy Functions (Backward Compatibility)
// ============================================================================

export async function submitInitProperty(args: InitPropertyArgs): Promise<{ txId: string }> {
  // Legacy function - maps to new RegisterProperty
  const propertyData: PropertyData = {
    propertyId: String(args.propertyId),
    title: 'Legacy Property',
    totalTokens: args.totalTokens,
    remainingTokens: args.totalTokens,
    totalValue: 0,
    tokenPrice: 0,
    propertyUsage: 'RESIDENTIAL',
    landType: 'URBAN',
    municipality: '',
    district: ''
  }
  return registerProperty(propertyData)
}

export async function submitMintTokens(args: MintArgs): Promise<{ txId: string }> {
  return mintTokens(
    String(args.propertyId),
    String(args.userId),
    args.tokens,
    args.orderId || `ORDER-${Date.now()}`
  )
}

export async function submitTransferTokens(args: TransferArgs): Promise<{ txId: string }> {
  return transferTokens(
    String(args.propertyId),
    String(args.fromUserId),
    String(args.toUserId),
    args.tokens
  )
}

export async function evaluateGetBalance(userId: number, propertyId: number): Promise<number> {
  return getBalance(String(userId), String(propertyId))
}

export async function evaluateGetHoldings(userId: number): Promise<Array<{ propertyId: number; tokens: number }>> {
  const holdings = await getHoldings(String(userId))
  return holdings.map(h => ({ propertyId: Number(h.propertyId), tokens: h.tokens }))
}

// ============================================================================
// Blockchain Explorer Query Functions
// ============================================================================

/**
 * Get all properties from blockchain ledger
 */
export async function getAllPropertiesFromLedger(): Promise<any[]> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  if (debug) console.log('📥 Querying Fabric: GetAllProperties')
  
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetAllProperties')
    const txt = Buffer.from(res).toString('utf8')
    const properties = JSON.parse(txt)
    const result = Array.isArray(properties) ? properties : []
    
    if (debug) {
      console.log(`✅ Retrieved ${result.length} properties from Fabric ledger`)
      if (result.length > 0) {
        console.log(`   Sample: ${JSON.stringify(result[0], null, 2)}`)
      }
    }
    
    return result
  } catch (err: any) {
    console.error('❌ Failed to query GetAllProperties from Fabric')
    console.error(`   Error: ${err.message}`)
    if (err.endorsements) {
      console.error(`   Endorsements: ${JSON.stringify(err.endorsements)}`)
    }
    console.error('   This usually means:')
    console.error('   1. Chaincode is not deployed/committed')
    console.error('   2. Chaincode function does not exist')
    console.error('   3. Peer cannot instantiate the chaincode')
    console.error('')
    console.error('   To fix: cd scripts/fabric && ./reset_network.sh')
    throw err
  } finally {
    gateway.disconnect()
  }
}

/**
 * Get all digital deeds from blockchain ledger
 */
export async function getAllDeedsFromLedger(): Promise<any[]> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  if (debug) console.log('📥 Querying Fabric: GetAllDeeds')
  
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetAllDeeds')
   const txt = Buffer.from(res).toString('utf8')
    const deeds = JSON.parse(txt)
    const result = Array.isArray(deeds) ? deeds : []
    
    if (debug) {
      console.log(`✅ Retrieved ${result.length} deeds from Fabric ledger`)
    }
    
    return result
  } catch (err: any) {
    console.error('❌ Failed to query GetAllDeeds from Fabric')
    console.error(`   Error: ${err.message}`)
    console.error('   To fix: cd scripts/fabric && ./reset_network.sh')
    throw err
  } finally {
    gateway.disconnect()
  }
}

/**
 * Get all holdings from blockchain ledger
 */
export async function getAllHoldingsFromLedger(): Promise<any[]> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  if (debug) console.log('📥 Querying Fabric: GetAllHoldings')
  
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetAllHoldings')
    const txt = Buffer.from(res).toString('utf8')
    const holdings = JSON.parse(txt)
    const result = Array.isArray(holdings) ? holdings : []
    
    if (debug) {
      console.log(`✅ Retrieved ${result.length} holdings from Fabric ledger`)
    }
    
    return result
  } catch (err: any) {
    console.error('❌ Failed to query GetAllHoldings from Fabric')
    console.error(`   Error: ${err.message}`)
    console.error('   To fix: cd scripts/fabric && ./reset_network.sh')
    throw err
  } finally {
    gateway.disconnect()
  }
}

/**
 * Get transaction history from blockchain
 */
export async function getTransactionHistoryFromLedger(limit: number = 100): Promise<any[]> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
 const { gateway, contract, network } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction('GetTransactionHistory', String(limit))
    const txt = Buffer.from(res).toString('utf8')
    const history = JSON.parse(txt)
    return Array.isArray(history) ? history : []
  } finally {
    gateway.disconnect()
  }
}

/**
 * Get blockchain events by querying the network
 * This retrieves actual chaincode events emitted during transactions
 */
export async function getBlockchainEvents(limit: number = 100): Promise<any[]> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    // Get recent block events
    const channel = network.getChannel()
    const events: any[] = []
    
    // Note: This is a simplified version. In production, you'd use
    // event listeners or query the block history
    return events
  } finally {
    gateway.disconnect()
  }
}

/**
 * Generic evaluate transaction helper
 */
export async function evaluateTransaction(functionName: string, ...args: string[]): Promise<any> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getLegacyContract()
  try {
    const res = await contract.evaluateTransaction(functionName, ...args)
    const txt = Buffer.from(res).toString('utf8')
    try {
      return JSON.parse(txt)
    } catch {
      return txt
    }
  } finally {
    gateway.disconnect()
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

// ============================================================================
// Generic Transaction Helpers
// ============================================================================

/**
 * Generic helper to submit a transaction to the blockchain
 * @param contractName - Name of the contract (e.g., 'estathub')
 * @param functionName - Name of the chaincode function to call
 * @param args - Arguments to pass to the function
 * @returns Transaction ID
 */
export async function submitTxn(
  contractName: string,
  functionName: string,
  ...args: string[]
): Promise<{ txId: string; result?: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  
  const debug = process.env.FABRIC_DEBUG === 'true'
  const { gateway, contract } = await getLegacyContract()
  
  try {
    if (debug) {
      console.log(`📤 Submitting transaction: ${functionName}`)
      console.log(`   Args: [${args.join(', ')}]`)
    }
    
    const startTime = Date.now()
    const result = await contract.submitAsync(functionName, {
      arguments: args
    })
    const endTime = Date.now()
    const txId = result.getTransactionId()
    await result.getStatus()
    
    if (debug) {
      console.log(`✅ Transaction committed successfully`)
      console.log(`   TxID: ${txId}`)
      console.log(`   Duration: ${endTime - startTime}ms`)
    } else {
      console.log(`✅ Tx submitted to Fabric: ${functionName}(${args.join(', ')}) - TxID: ${txId}`)
    }
    
    return { txId, result: '' }
  } catch (error: any) {
    console.error(`❌ Transaction failed: ${functionName}`)
    console.error(`   Error: ${error.message}`)
    
    if (debug) {
      console.error(`   Stack: ${error.stack}`)
      if (error.endorsements) {
        console.error(`   Endorsements:`, JSON.stringify(error.endorsements, null, 2))
      }
      if (error.responses) {
        console.error(`   Peer responses:`, JSON.stringify(error.responses, null, 2))
      }
    }
    
    throw error
  } finally {
    gateway.disconnect()
  }
}

/**
 * Generic helper to evaluate a transaction (read-only query)
 * @param contractName - Name of the contract
 * @param functionName - Name of the chaincode function to call
 * @param args - Arguments to pass to the function
 * @returns Query result as string
 */
export async function evaluateTxn(
  contractName: string,
  functionName: string,
  ...args: string[]
): Promise<string> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  
  const { gateway, contract } = await getLegacyContract()
  try {
    const result = await contract.evaluateTransaction(functionName, ...args)
    console.log(`✅ Query executed: ${functionName}(${args.join(', ')})`)
    return result.toString()
  } finally {
    gateway.disconnect()
  }
}

export function isFabricEnabled(): boolean {
  return USE_FABRIC
}

/**
 * Test Fabric connection on startup
 */
export async function testFabricConnection(): Promise<void> {
  if (!USE_FABRIC) {
    throw new Error('Fabric is disabled')
  }
  
  const debug = process.env.FABRIC_DEBUG === 'true'
  
  try {
    if (debug) console.log('🧪 Testing Fabric connection...')
    
    // This will throw if connection fails
   const { gateway, contract } = await getLegacyContract()
    
    try {
      // Try a simple query to verify the contract is accessible
      await contract.evaluateTransaction('GetAllProperties')
      
      if (debug) console.log('✅ Fabric connection test successful')
    } finally {
      gateway.disconnect()
    }
  } catch (err: any) {
    console.error('❌ Fabric connection test failed:', err.message)
    throw err
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await getContract()
    return true
  } catch (error) {
    console.error('Fabric connection test failed:', error)
    return false
  }
}
