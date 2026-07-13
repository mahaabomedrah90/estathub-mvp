// ============================================================================
// PropertyLead internal scoring
// ----------------------------------------------------------------------------
// Pure, side-effect-free helpers used by the PropertyLead controller to derive
// INTERNAL admin-only signals from a submitted lead. These values must never be
// exposed to owner-facing endpoints.
// ============================================================================

export interface LeadScoringInput {
  applicantType?: string | null
  fullName?: string | null
  phone?: string | null
  propertyType?: string | null
  city?: string | null
  district?: string | null
  googleMapsUrl?: string | null
  requestedPrice?: number | null
  landArea?: number | null
  buildingArea?: number | null
  isLeased?: boolean | null
  annualRent?: number | null
  hasMortgage?: boolean | null
  hasOwnershipPartner?: boolean | null
  hasLegalDispute?: boolean | null
  noLegalIssues?: boolean | null
  shortDescription?: string | null
  imageUrls?: unknown
}

export type InternalRecommendation = 'PROCEED' | 'NEED_MORE_INFORMATION' | 'REJECT'

export interface LeadScores {
  qualificationScore: number           // 0–100
  tokenizationSuitabilityScore: number // 0–100
  internalRecommendation: InternalRecommendation
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const pos = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0
const imageCount = (v: unknown) => (Array.isArray(v) ? v.length : 0)

// Legal status is considered "clean" when explicitly declared clean, or when
// none of the individual risk flags are set to true.
function legalClean(f: LeadScoringInput): boolean {
  if (f.noLegalIssues === true) return true
  return f.hasMortgage !== true && f.hasOwnershipPartner !== true && f.hasLegalDispute !== true
}

/**
 * Completeness / quality score, 0–100.
 * Applicant 15 · Type+Location 20 · Price+Area 20 · Lease data 15 · Legal 20 · Desc+Images 10
 */
export function qualificationScore(f: LeadScoringInput): number {
  let s = 0

  // Applicant info (15)
  if (f.applicantType && f.fullName && f.phone) s += 15

  // Property type + location (20)
  if (f.propertyType && f.city && f.district) s += 20

  // Clear price and area (20)
  if (pos(f.requestedPrice) && (pos(f.landArea) || pos(f.buildingArea))) s += 20
  else if (pos(f.requestedPrice)) s += 10

  // Lease income data (15): answered clearly, and if leased, rent provided
  if (f.isLeased === true && pos(f.annualRent)) s += 15
  else if (f.isLeased === false) s += 15

  // Legal clarity (20)
  if (legalClean(f)) s += 20

  // Description + images (10)
  const hasDesc = !!(f.shortDescription && String(f.shortDescription).trim().length > 0)
  const imgs = imageCount(f.imageUrls)
  if (hasDesc && imgs >= 1) s += 10
  else if (hasDesc || imgs >= 1) s += 5

  return clamp(s)
}

/**
 * Tokenization suitability score, 0–100.
 * Rewards income (leased), clear location and clean legal status; penalizes
 * mortgage / legal dispute / ownership partner and missing price/area.
 */
export function tokenizationSuitabilityScore(f: LeadScoringInput): number {
  let s = 50

  if (f.isLeased === true && pos(f.annualRent)) s += 15
  if (f.city && f.district && f.googleMapsUrl) s += 10
  if (legalClean(f)) s += 15

  if (f.hasMortgage === true) s -= 20
  if (f.hasLegalDispute === true) s -= 20
  if (f.hasOwnershipPartner === true) s -= 10
  if (!pos(f.requestedPrice) || !(pos(f.landArea) || pos(f.buildingArea))) s -= 15

  return clamp(s)
}

export function internalRecommendation(
  qualification: number,
  suitability: number,
  f: LeadScoringInput
): InternalRecommendation {
  // A live legal dispute always warrants more information before proceeding.
  if (f.hasLegalDispute === true) {
    return qualification < 40 ? 'REJECT' : 'NEED_MORE_INFORMATION'
  }
  if (qualification >= 70 && suitability >= 60) return 'PROCEED'
  if (qualification >= 40) return 'NEED_MORE_INFORMATION'
  return 'REJECT'
}

export function scoreLead(f: LeadScoringInput): LeadScores {
  const q = qualificationScore(f)
  const t = tokenizationSuitabilityScore(f)
  return {
    qualificationScore: q,
    tokenizationSuitabilityScore: t,
    internalRecommendation: internalRecommendation(q, t, f),
  }
}
