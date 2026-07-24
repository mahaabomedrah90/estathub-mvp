import { getSetting } from '../controllers/settings.controller'

export async function getPlatformFeeRate(): Promise<number> {
  const raw = await getSetting('platformFee', '5')
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 5
}

export function calcPlatformFee(investmentAmount: number, feeRatePct: number): number {
  return parseFloat((investmentAmount * feeRatePct / 100).toFixed(2))
}

// ── Private validation helpers ────────────────────────────────────────────────

function configError(message: string): never {
  const err = new Error(message) as any
  err.code = 'INVALID_SETTING_VALUE'
  throw err
}

function snapshotError(message: string): never {
  const err = new Error(message) as any
  err.code = 'INVALID_FEE_SNAPSHOT'
  throw err
}

/**
 * Parse a boolean setting string using strict matching.
 *   ''      → key absent from DB and DEFAULT_SETTINGS → documented default applies.
 *   'true'  → true
 *   'false' → false
 *   else    → INVALID_SETTING_VALUE
 */
function parseBoolSetting(raw: string, key: string, defaultForAbsent: boolean): boolean {
  if (raw === '') return defaultForAbsent
  if (raw === 'true')  return true
  if (raw === 'false') return false
  return configError(`Setting "${key}" has invalid boolean value "${raw}". Expected 'true' or 'false'.`)
}

/**
 * Parse a numeric setting string using Number() (strict — rejects "5abc", "", etc).
 *   ''              → key absent → documented default applies (null means required → throws).
 *   non-finite      → INVALID_SETTING_VALUE
 *   out of [min,max] → INVALID_SETTING_VALUE
 *   zero            → valid
 */
function parseNumSetting(
  raw: string, key: string, defaultForAbsent: number | null, min: number, max: number
): number {
  if (raw === '') {
    if (defaultForAbsent !== null) return defaultForAbsent
    return configError(`Setting "${key}" is required but absent.`)
  }
  const parsed = Number(raw)   // strict: "5abc" → NaN, unlike parseFloat
  if (!Number.isFinite(parsed)) {
    return configError(`Setting "${key}" value "${raw}" is not a valid number.`)
  }
  if (parsed < min || parsed > max) {
    return configError(`Setting "${key}" value ${parsed} is outside valid range [${min}, ${max}].`)
  }
  return parsed
}

/**
 * Parse a numeric setting that always has a DEFAULT_SETTINGS fallback (never absent).
 * Used for non-investor rates (managementFeeRate, reserveRate, ownerFeeRate, etc.).
 * Uses Number() for strict parsing — "5abc" is rejected, not silently truncated.
 */
function parseNumSettingWithDefault(raw: string, key: string, fallback: number): number {
  if (raw === '') return fallback  // unreachable for keys in DEFAULT_SETTINGS; kept for safety
  const parsed = Number(raw)       // strict
  if (!Number.isFinite(parsed)) {
    return configError(`Setting "${key}" value "${raw}" is not a valid number.`)
  }
  if (parsed < 0) {
    return configError(`Setting "${key}" value ${parsed} must be >= 0.`)
  }
  return parsed
}

// ── Shared investor-settings resolver ────────────────────────────────────────

interface InvestorSettings {
  enabled:       boolean
  rate:          number  // [0, 100]
  minimumAmount: number  // >= 0
}

/**
 * Read and validate the three investor fee settings from Global Settings (DB).
 *
 * Setting keys and their current status in settings.controller.ts:
 *
 *   'platformFee'              → rate          (stored; DEFAULT_SETTINGS: '5'; editable via Settings API)
 *   'investorFeeEnabled'       → enabled       (NOT in DEFAULT_SETTINGS, NOT editable via Settings API/UI —
 *                                               treat absence as documented default: true)
 *   'investorFeeMinimumAmount' → minimumAmount (NOT in DEFAULT_SETTINGS, NOT editable via Settings API/UI —
 *                                               treat absence as documented default: 0)
 *
 * Absence vs invalid:
 *   absent (getSetting returns '') → documented default applied; logged at info level.
 *   present but malformed         → INVALID_SETTING_VALUE thrown; no silent fallback.
 */
async function resolveInvestorSettings(): Promise<InvestorSettings> {
  const [platformFeeRaw, feeEnabledRaw, feeMinimumRaw] = await Promise.all([
    // '' fallback → DEFAULT_SETTINGS['platformFee']='5' wins; never returns ''
    getSetting('platformFee',              ''),
    // '' fallback → no DEFAULT_SETTINGS entry → returns '' when key absent from DB
    getSetting('investorFeeEnabled',       ''),
    // '' fallback → no DEFAULT_SETTINGS entry → returns '' when key absent from DB
    getSetting('investorFeeMinimumAmount', ''),
  ])

  if (feeEnabledRaw === '') {
    console.info('[fees] investorFeeEnabled absent from settings — applying documented default: true')
  }
  const enabled = parseBoolSetting(feeEnabledRaw, 'investorFeeEnabled', true)

  // DEFAULT_SETTINGS provides '5' so platformFeeRaw is never ''; defaultForAbsent=5 is a safety net
  const rate = parseNumSetting(platformFeeRaw, 'platformFee (investorFeeRate)', 5, 0, 100)

  if (feeMinimumRaw === '') {
    console.info('[fees] investorFeeMinimumAmount absent from settings — applying documented default: 0')
  }
  const minimumAmount = parseNumSetting(feeMinimumRaw, 'investorFeeMinimumAmount', 0, 0, Infinity)

  return { enabled, rate, minimumAmount }
}

// ── buildPropertyFeeSnapshot ──────────────────────────────────────────────────

/**
 * Build the fee snapshot for a Property from global settings — the four approved
 * MVP fee values only:
 *   preparationFee    ← propertyPreparationFee (fixed SAR, owner onboarding)
 *   investorFeeRate   ← platformFee (via resolveInvestorSettings)
 *   managementFeeRate ← managementFeeRate (% of rental income, ALWSM revenue)
 *   reserveRate       ← reserveRate (% of rental income, NOT revenue)
 *
 * Used ONLY for direct-submit properties with no finalized PropertyLead snapshot;
 * lead-originated properties keep the snapshot copied at conversion (never rebuilt).
 */
export async function buildPropertyFeeSnapshot(): Promise<Record<string, unknown>> {
  const [investorSettings, managementFeeRate, reserveRate, preparationFee] = await Promise.all([
    resolveInvestorSettings(),
    getSetting('managementFeeRate',      '8'),
    getSetting('reserveRate',            '3'),
    getSetting('propertyPreparationFee', '0'),
  ])

  return {
    preparationFee:    parseNumSettingWithDefault(preparationFee,    'propertyPreparationFee', 0),
    investorFeeRate:   investorSettings.rate,
    managementFeeRate: parseNumSettingWithDefault(managementFeeRate, 'managementFeeRate',       8),
    reserveRate:       parseNumSettingWithDefault(reserveRate,       'reserveRate',             3),
    source:            'global_settings_mvp4',
    lockedAt:          new Date().toISOString(),
  }
}

// ── calculateInvestorOrderFee ─────────────────────────────────────────────────

/**
 * Resolve investor fee for a new Order.
 *
 * Source-of-truth priority:
 *   1. property.feeSnapshot — locked at property approval time
 *   2. Global Settings via resolveInvestorSettings() — ONLY when feeSnapshot is entirely absent
 *
 * Snapshot validation (strict — present-but-malformed always throws):
 *   investorFeeRate          — required; finite; [0, 100]
 *   investorFeeEnabled       — optional; absent → true (backward compat); present → must be boolean
 *   investorFeeMinimumAmount — optional; absent → 0  (backward compat); present → finite, >= 0
 *
 * Behavior:
 *   enabled=false  → feeAmount=0, totalPayable=investmentAmount
 *   minimumAmount  → fee = max(percentage fee, minimumAmount)
 */
export async function calculateInvestorOrderFee(
  property: { feeSnapshot?: unknown },
  investmentAmount: number
): Promise<{ feeRateSnapshot: number; feeAmountSnapshot: number; totalPayable: number }> {
  // ── Input validation ────────────────────────────────────────────────────────
  if (!Number.isFinite(investmentAmount) || investmentAmount <= 0) {
    const err = new Error(
      `INVALID_INVESTMENT_AMOUNT: investmentAmount must be finite and > 0, got ${investmentAmount}`
    ) as any
    err.code = 'INVALID_INVESTMENT_AMOUNT'
    throw err
  }

  const snap = property.feeSnapshot as Record<string, unknown> | null | undefined

  let feeRate: number
  let feeEnabled: boolean
  let feeMinimum: number

  if (snap != null) {
    // ── Snapshot present — validate strictly; never silently fall back ─────────

    // investorFeeRate: required, finite, [0, 100]
    const rawRate = snap.investorFeeRate
    if (rawRate == null) {
      snapshotError('INVALID_FEE_SNAPSHOT: investorFeeRate is missing')
    }
    const parsedRate = Number(rawRate)
    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      snapshotError(
        `INVALID_FEE_SNAPSHOT: investorFeeRate "${rawRate}" must be a finite number in [0, 100]`
      )
    }
    feeRate = parsedRate

    // investorFeeEnabled: absent → true (backward compat); present → strict boolean only
    const rawEnabled = snap.investorFeeEnabled
    if (rawEnabled === undefined || rawEnabled === null) {
      feeEnabled = true
    } else if (rawEnabled === true || rawEnabled === false) {
      feeEnabled = rawEnabled as boolean
    } else {
      snapshotError(
        `INVALID_FEE_SNAPSHOT: investorFeeEnabled "${rawEnabled}" must be a boolean`
      )
    }

    // investorFeeMinimumAmount: absent → 0 (backward compat); present → finite, >= 0
    const rawMin = snap.investorFeeMinimumAmount
    if (rawMin === undefined || rawMin === null) {
      feeMinimum = 0
    } else {
      const parsedMin = Number(rawMin)
      if (!Number.isFinite(parsedMin) || parsedMin < 0) {
        snapshotError(
          `INVALID_FEE_SNAPSHOT: investorFeeMinimumAmount "${rawMin}" must be a finite number >= 0`
        )
      }
      feeMinimum = parsedMin
    }
  } else {
    // ── No snapshot — legacy property (approved before snapshot feature) ───────
    // Uses the same resolver as buildPropertyFeeSnapshot — identical validation rules,
    // same defaults, same error behavior. No separate hardcoding.
    console.warn('[fees] Property has no feeSnapshot — reading investor fee settings from Global Settings')
    const s = await resolveInvestorSettings()
    feeRate    = s.rate
    feeEnabled = s.enabled
    feeMinimum = s.minimumAmount
  }

  // Fee disabled: investor pays only the investment amount; rate preserved for audit
  if (!feeEnabled) {
    return {
      feeRateSnapshot:   feeRate,
      feeAmountSnapshot: 0,
      totalPayable:      investmentAmount,
    }
  }

  // Fee enabled: percentage fee, floored to minimum if configured
  let feeAmount = parseFloat((investmentAmount * feeRate / 100).toFixed(2))
  if (feeMinimum > 0 && feeAmount < feeMinimum) {
    feeAmount = feeMinimum
  }

  return {
    feeRateSnapshot:   feeRate,
    feeAmountSnapshot: feeAmount,
    totalPayable:      parseFloat((investmentAmount + feeAmount).toFixed(2)),
  }
}
