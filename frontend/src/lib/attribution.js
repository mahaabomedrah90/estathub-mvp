// Marketing attribution (UTM) for waitlist registrations.
// The first known attribution is kept in localStorage so it survives SPA
// navigation and reloads until the visitor registers. Only campaign metadata
// is stored here — never contact details or other personal data.
// Every function is best-effort and never throws: attribution must never
// block a waitlist registration.

const STORAGE_KEY = 'alwsm_attribution_v1'
const TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_VALUE_LENGTH = 150
const MAX_URL_LENGTH = 2048

const UTM_PARAMS = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
}

const PAYLOAD_FIELDS = [...Object.values(UTM_PARAMS), 'landingUrl', 'referrer']

let memoryAttribution = null

function cleanValue(value) {
  if (typeof value !== 'string') return null
  const text = value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return text ? text.slice(0, MAX_VALUE_LENGTH) : null
}

// Keeps origin + path (+ UTM params for the landing URL). Other query params
// and the hash are dropped so no personal data ends up in attribution.
function safeUrl(raw, keepUtm) {
  try {
    if (!raw) return null
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const result = new URL(url.origin + url.pathname)
    if (keepUtm) {
      Object.keys(UTM_PARAMS).forEach((key) => {
        const value = cleanValue(url.searchParams.get(key))
        if (value) result.searchParams.set(key, value)
      })
    }
    return result.toString().slice(0, MAX_URL_LENGTH)
  } catch {
    return null
  }
}

function readStored() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
    if (!parsed || typeof parsed !== 'object' || typeof parsed.utmSource !== 'string') return null
    if (typeof parsed.capturedAt !== 'number' || Date.now() - parsed.capturedAt > TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeStored(attribution) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    // Storage unavailable (private mode, blocked) — in-memory copy still works.
  }
}

// Call once on app start, before any navigation.
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search)
    const utm = {}
    Object.entries(UTM_PARAMS).forEach(([param, field]) => {
      utm[field] = cleanValue(params.get(param))
    })
    if (utm.utmSource) utm.utmSource = utm.utmSource.toLowerCase()

    // Keep the first known campaign. A later campaign landing only replaces
    // a previously captured "direct" visit.
    const stored = readStored()
    if (stored && (stored.utmSource !== 'direct' || !utm.utmSource)) {
      memoryAttribution = stored
      return stored
    }

    let referrer = null
    try {
      if (document.referrer && new URL(document.referrer).origin !== window.location.origin) {
        referrer = safeUrl(document.referrer, false)
      }
    } catch {
      referrer = null
    }

    const attribution = {
      ...utm,
      utmSource: utm.utmSource || 'direct',
      landingUrl: safeUrl(window.location.href, true),
      referrer,
      capturedAt: Date.now(),
    }
    memoryAttribution = attribution
    writeStored(attribution)
    return attribution
  } catch {
    return null
  }
}

// Attribution fields for the POST /api/waitlist payload ({} on any failure).
export function getAttributionPayload() {
  try {
    const attribution = readStored() || memoryAttribution || captureAttribution()
    if (!attribution) return {}
    const payload = {}
    PAYLOAD_FIELDS.forEach((field) => {
      if (typeof attribution[field] === 'string' && attribution[field]) payload[field] = attribution[field]
    })
    return payload
  } catch {
    return {}
  }
}
