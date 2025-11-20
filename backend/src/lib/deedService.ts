import crypto from 'node:crypto'
import { prisma } from './prisma'

/**
 * Generate unique deed number
 * Format: DEED-{YEAR}-{SEQUENCE}
 */
export async function generateDeedNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  // Get count of deeds issued this year
  const count = await prisma.digitalDeed.count({
    where: {
      deedNumber: {
        startsWith: `DEED-${year}-`
      }
    }
  })
  
  const sequence = String(count + 1).padStart(5, '0')
  return `DEED-${year}-${sequence}`
}

/**
 * Calculate SHA-256 hash of deed data
 * Used for PDF verification via QR code
 */
export function calculateDeedHash(deedData: {
  deedNumber: string
  userId: number
  propertyId: number
  ownedTokens: number
  issuedAt: string
}): string {
  const data = JSON.stringify(deedData)
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Generate QR code data for deed verification
 * Format: URL to verification page with deed number and hash
 */
export function generateQRCodeData(deedNumber: string, deedHash: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  return `${baseUrl}/verify-deed?deed=${deedNumber}&hash=${deedHash}`
}

/**
 * Generate mock PDF deed (placeholder)
 * In production, this would use a PDF library like pdfkit or puppeteer
 */
export async function generateDeedPDF(deedData: {
  deedNumber: string
  userName: string
  propertyTitle: string
  ownedTokens: number
  ownershipPct: number
  issuedAt: string
  municipality: string
  district: string
}): Promise<{ pdfUrl: string; pdfHash: string }> {
  // TODO: Implement actual PDF generation
  // For now, return mock data
  
  const pdfContent = JSON.stringify(deedData)
  const pdfHash = crypto.createHash('sha256').update(pdfContent).digest('hex')
  
  // In production, save PDF to storage and return URL
  const pdfUrl = `/deeds/${deedData.deedNumber}.pdf`
  
  console.log(`📄 Mock PDF generated for deed: ${deedData.deedNumber}`)
  
  return { pdfUrl, pdfHash }
}

/**
 * Validate deed data before issuance
 */
export function validateDeedData(data: {
  userId: number
  propertyId: number
  ownedTokens: number
}): { valid: boolean; error?: string } {
  if (!data.userId || data.userId <= 0) {
    return { valid: false, error: 'Invalid user ID' }
  }
  
  if (!data.propertyId || data.propertyId <= 0) {
    return { valid: false, error: 'Invalid property ID' }
  }
  
  if (!data.ownedTokens || data.ownedTokens <= 0) {
    return { valid: false, error: 'Invalid token amount' }
  }
  
  return { valid: true }
}

/**
 * Check if user already has a deed for this property
 */
export async function userHasDeedForProperty(
  userId: number,
  propertyId: number
): Promise<boolean> {
  const existingDeed = await prisma.digitalDeed.findFirst({
    where: {
      userId: userId.toString(),
      propertyId: propertyId.toString(),
      status: {
        in: ['ISSUED', 'PENDING_APPROVAL']
      }
    }
  })
  
  return !!existingDeed
}