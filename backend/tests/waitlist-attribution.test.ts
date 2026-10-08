/**
 * Tests for waitlist marketing attribution normalization.
 *
 *   npm test
 *
 * Dependency-free unit tests (node:test via tsx). They require no database.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeAttribution } from '../src/controllers/waitlist.controller'

const ROOT = join(__dirname, '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

const EMPTY = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  landingUrl: null,
  referrer: null,
}

describe('normalizeAttribution', () => {
  test('legacy payload without attribution stores nulls (unknown)', () => {
    assert.deepEqual(normalizeAttribution({ contact: 'a@b.co', source: 'home' }), EMPTY)
    assert.deepEqual(normalizeAttribution(undefined), EMPTY)
  })

  test('direct visit', () => {
    assert.equal(normalizeAttribution({ utmSource: 'direct' }).utmSource, 'direct')
  })

  for (const channel of ['x', 'instagram', 'tiktok']) {
    test(`${channel} campaign`, () => {
      const result = normalizeAttribution({
        utmSource: channel,
        utmMedium: 'paid_social',
        utmCampaign: 'alwsm_waitlist_oct2026',
        utmContent: 'teaser_meter_owner_v1',
        landingUrl: `https://alwsm.sa/?utm_source=${channel}&utm_medium=paid_social`,
        referrer: 'https://t.co/',
      })
      assert.equal(result.utmSource, channel)
      assert.equal(result.utmMedium, 'paid_social')
      assert.equal(result.utmCampaign, 'alwsm_waitlist_oct2026')
      assert.equal(result.utmContent, 'teaser_meter_owner_v1')
      assert.equal(result.utmTerm, null)
      assert.equal(result.landingUrl, `https://alwsm.sa/?utm_source=${channel}&utm_medium=paid_social`)
      assert.equal(result.referrer, 'https://t.co/')
    })
  }

  test('utmSource is trimmed and lowercased', () => {
    assert.equal(normalizeAttribution({ utmSource: '  Instagram ' }).utmSource, 'instagram')
  })

  test('malformed values are dropped, never thrown', () => {
    const result = normalizeAttribution({
      utmSource: 42,
      utmMedium: { $ne: 1 },
      utmCampaign: ['a'],
      utmContent: '   ',
      landingUrl: 'javascript:alert(1)',
      referrer: 'not a url',
    })
    assert.deepEqual(result, EMPTY)
  })

  test('long values are truncated and URL hash removed', () => {
    const result = normalizeAttribution({
      utmCampaign: 'c'.repeat(500),
      landingUrl: 'https://alwsm.sa/path#secret',
    })
    assert.equal(result.utmCampaign?.length, 150)
    assert.equal(result.landingUrl, 'https://alwsm.sa/path')
  })
})

describe('POST /api/waitlist contract is unchanged', () => {
  const src = read('src/controllers/waitlist.controller.ts')

  test('still responds 201 { success, id } and keeps source handling', () => {
    assert.match(src, /res\.status\(201\)\.json\(\{ success: true, id: lead\.id \}\)/)
    assert.match(src, /source = 'home'/)
    assert.match(src, /waitlistRegistrationLimiter/)
  })

  test('migration is additive only', () => {
    const sql = read('prisma/migrations/20261008120000_add_waitlist_attribution/migration.sql')
    const statements = sql.split('\n').filter(line => line.trim() && !line.startsWith('--'))
    assert.equal(statements.length, 7)
    for (const line of statements) {
      assert.match(line, /^ALTER TABLE "WaitlistLead" ADD COLUMN "\w+" TEXT;$/)
    }
  })
})
