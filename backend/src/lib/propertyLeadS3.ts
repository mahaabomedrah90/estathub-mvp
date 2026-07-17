// ============================================================================
// PropertyLead document storage on private S3 (Phase 2a).
// - New uploads go to a PRIVATE bucket (env PROPERTYLEAD_DOCS_BUCKET); we store
//   S3 object KEYS in the existing PropertyLead.imageUrls / deedImageUrl fields.
// - Access is only ever via short-lived pre-signed GET URLs, generated after
//   authorization in the controller. Nothing here is publicly served.
// - Legacy local URLs ("/api/uploads/properties/...") remain supported by the
//   controller/frontend; helpers below let callers tell keys from legacy URLs.
// Uses aws-sdk v2 (already a dependency via SES). No new dependency.
// ============================================================================
import AWS from 'aws-sdk'
import path from 'path'
import crypto from 'crypto'

const REGION = process.env.AWS_REGION || 'eu-central-1'
const s3 = new AWS.S3({ region: REGION })

export const PROPERTYLEAD_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const SIGNED_URL_TTL_SECONDS = 300 // 5 minutes

export function getDocsBucket(): string | null {
  return process.env.PROPERTYLEAD_DOCS_BUCKET || null
}

// Legacy container-local URLs look like "/api/uploads/properties/lead-...".
export function isLegacyLocalUrl(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('/api/uploads/')
}
// New S3 object keys look like "property-leads/..." (no leading slash, no scheme).
export function isS3Key(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('property-leads/')
}

// Strip path components, normalize, keep a safe [word .-] stem + lowercased ext.
export function sanitizeFilename(originalName: string): string {
  const base = path.basename(String(originalName || 'file'))
  const ext = path.extname(base).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10)
  const stem = base
    .slice(0, base.length - path.extname(base).length)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'file'
  return `${stem}${ext}`
}

// property-leads/{leadId}/{ts}-{rand}-{safe}  OR  property-leads/pending/{ownerId}/{ts}-{rand}-{safe}
export function buildPropertyLeadKey(opts: { ownerId: string; leadId?: string | null; originalName: string }): string {
  const safe = sanitizeFilename(opts.originalName)
  const ts = Date.now()
  const rand = crypto.randomBytes(4).toString('hex')
  const prefix = opts.leadId ? `property-leads/${opts.leadId}` : `property-leads/pending/${opts.ownerId}`
  return `${prefix}/${ts}-${rand}-${safe}`
}

// Server-side magic-byte validation (do not trust client-declared mimetype).
export function detectMimeFromMagic(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buffer.slice(0, 5).toString('ascii') === '%PDF-') return 'application/pdf'
  return null
}

export class DocsNotConfiguredError extends Error {
  constructor() { super('DOCS_BUCKET_NOT_CONFIGURED') }
}

export async function uploadPropertyLeadDocument(opts: { buffer: Buffer; key: string; contentType: string }): Promise<void> {
  const Bucket = getDocsBucket()
  if (!Bucket) throw new DocsNotConfiguredError()
  // Serve images inline (already magic-validated as raster, not SVG/HTML); force
  // attachment for PDFs and anything else to avoid inline rendering surprises.
  const disposition = opts.contentType.startsWith('image/') ? 'inline' : 'attachment'
  await s3
    .putObject({
      Bucket,
      Key: opts.key,
      Body: opts.buffer,
      ContentType: opts.contentType,
      ContentDisposition: `${disposition}; filename="${path.basename(opts.key)}"`,
      ServerSideEncryption: 'AES256',
    })
    .promise()
}

export async function getSignedPropertyLeadUrl(key: string, expiresSeconds: number = SIGNED_URL_TTL_SECONDS): Promise<string> {
  const Bucket = getDocsBucket()
  if (!Bucket) throw new DocsNotConfiguredError()
  return s3.getSignedUrlPromise('getObject', { Bucket, Key: key, Expires: expiresSeconds })
}
