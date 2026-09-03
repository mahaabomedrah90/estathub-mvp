/**
 * Tests for the app-store reviewer read-only guard.
 *
 *   npm test
 *
 * These are dependency-free unit tests (node:test via tsx) covering the
 * authorization logic and the route wiring. They require no database.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createStoreReviewerGuard } from '../src/middleware/storeReviewer'

const ROOT = join(__dirname, '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

// ── helpers ────────────────────────────────────────────────────────────────
function mockRes() {
  const res: any = { statusCode: 0, body: undefined, ended: false }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (b: any) => { res.body = b; res.ended = true; return res }
  return res
}
function dbReturning(value: { isStoreReviewer: boolean } | null) {
  const calls: any[] = []
  return {
    calls,
    user: {
      async findUnique(args: any) { calls.push(args); return value },
    },
  }
}

// ── C. reviewer is blocked on financial writes ─────────────────────────────
describe('C. reviewer blocked on financial writes', () => {
  test('returns 403 reviewer_account_readonly and does not call next()', async () => {
    const db = dbReturning({ isStoreReviewer: true })
    const guard = createStoreReviewerGuard(db as any)
    const res = mockRes()
    let nextCalled = false

    await guard({ user: { userId: 'reviewer-id' } } as any, res, () => { nextCalled = true })

    assert.equal(res.statusCode, 403)
    assert.equal(res.body.error, 'reviewer_account_readonly')
    assert.equal(nextCalled, false, 'request must not proceed to the handler')
  })

  test('looks the flag up by immutable user id, not email or display name', async () => {
    const db = dbReturning({ isStoreReviewer: true })
    const guard = createStoreReviewerGuard(db as any)
    await guard({ user: { userId: 'cuid-abc-123' } } as any, mockRes(), () => {})

    assert.equal(db.calls.length, 1)
    assert.deepEqual(db.calls[0].where, { id: 'cuid-abc-123' })
    assert.deepEqual(db.calls[0].select, { isStoreReviewer: true })
  })

  test('reads current state per request — never trusts the JWT', async () => {
    // A token minted before the flag was set carries no reviewer claim; the
    // guard must still block, because it re-reads the database every time.
    const db = dbReturning({ isStoreReviewer: true })
    const guard = createStoreReviewerGuard(db as any)
    const res = mockRes()
    const staleJwtUser = { userId: 'reviewer-id', role: 'INVESTOR' } // no flag
    await guard({ user: staleJwtUser } as any, res, () => {})
    assert.equal(res.statusCode, 403)
  })
})

// ── D. normal investors are unaffected ─────────────────────────────────────
describe('D. normal INVESTOR unaffected', () => {
  test('passes through when isStoreReviewer is false', async () => {
    const guard = createStoreReviewerGuard(dbReturning({ isStoreReviewer: false }) as any)
    const res = mockRes()
    let nextCalled = false
    await guard({ user: { userId: 'normal-investor' } } as any, res, () => { nextCalled = true })
    assert.equal(nextCalled, true)
    assert.equal(res.ended, false, 'no response written for a normal investor')
  })

  test('passes through when the user row is missing', async () => {
    const guard = createStoreReviewerGuard(dbReturning(null) as any)
    let nextCalled = false
    await guard({ user: { userId: 'ghost' } } as any, mockRes(), () => { nextCalled = true })
    assert.equal(nextCalled, true)
  })

  test('is inert for unauthenticated requests (auth() owns that rejection)', async () => {
    const db = dbReturning({ isStoreReviewer: true })
    const guard = createStoreReviewerGuard(db as any)
    let nextCalled = false
    await guard({} as any, mockRes(), () => { nextCalled = true })
    assert.equal(nextCalled, true)
    assert.equal(db.calls.length, 0, 'no query for an unauthenticated request')
  })
})

// ── fail-closed on an unevaluable authorization check ──────────────────────
describe('reviewer-status lookup failure must FAIL CLOSED', () => {
  const failingDb = { user: { async findUnique() { throw new Error('db down') } } }

  test('request does NOT reach the financial handler', async () => {
    const guard = createStoreReviewerGuard(failingDb as any)
    let reachedHandler = false
    await guard(
      { user: { userId: 'anyone' } } as any,
      mockRes(),
      () => { reachedHandler = true }
    )
    assert.equal(
      reachedHandler,
      false,
      'an unevaluable authorization check must never be treated as allowed'
    )
  })

  test('responds 503 reviewer_check_unavailable (retryable, not a silent allow)', async () => {
    const guard = createStoreReviewerGuard(failingDb as any)
    const res = mockRes()
    await guard({ user: { userId: 'anyone' } } as any, res, () => {})
    assert.equal(res.statusCode, 503)
    assert.equal(res.body.error, 'reviewer_check_unavailable')
  })

  test('holds for a normal investor too — the guard cannot know who this is', async () => {
    // The whole point: on lookup failure the identity is UNKNOWN. It must not
    // be assumed to be a normal investor.
    const guard = createStoreReviewerGuard(failingDb as any)
    const res = mockRes()
    let reachedHandler = false
    await guard(
      { user: { userId: 'normal-investor', role: 'INVESTOR' } } as any,
      res,
      () => { reachedHandler = true }
    )
    assert.equal(reachedHandler, false)
    assert.equal(res.statusCode, 503)
  })

  test('guard source contains no fail-open next() in its catch block', () => {
    const src = read('src/middleware/storeReviewer.ts')
    const catchBlock = src.slice(src.indexOf('} catch'))
    assert.ok(!/\bnext\(\)/.test(catchBlock), 'catch block must not call next()')
    assert.match(catchBlock, /503/)
  })
})

// ── C/B. route wiring: exactly the four write paths, no read paths ─────────
describe('route wiring', () => {
  const orders = read('src/controllers/orders.controller.ts')
  const wallet = read('src/controllers/wallet.controller.ts')
  const withdrawal = read('src/controllers/withdrawalRequest.controller.ts')

  test('C. guard is applied to all four protected write endpoints', () => {
    assert.match(orders, /ordersRouter\.post\('\/',[^)]*auth\(true\), storeReviewerGuard/)
    assert.match(orders, /ordersRouter\.post\('\/confirm',[^)]*auth\(true\), storeReviewerGuard/)
    assert.match(wallet, /walletRouter\.post\('\/deposit-request', auth\(true\), storeReviewerGuard/)
    assert.match(withdrawal, /withdrawalRequestRouter\.post\('\/', auth\(true\), storeReviewerGuard/)
  })

  test('guard runs after auth() so req.user.userId is populated', () => {
    for (const src of [orders, wallet, withdrawal]) {
      for (const line of src.split('\n').filter(l => l.includes('storeReviewerGuard') && l.includes('.post('))) {
        assert.ok(
          line.indexOf('auth(true)') < line.indexOf('storeReviewerGuard'),
          `guard must follow auth(true): ${line.trim()}`
        )
      }
    }
  })

  test('B. read-only endpoints are NOT guarded', () => {
    for (const src of [orders, wallet, withdrawal]) {
      for (const line of src.split('\n')) {
        if (/Router\.get\(/.test(line)) {
          assert.ok(!line.includes('storeReviewerGuard'), `GET must stay open: ${line.trim()}`)
        }
      }
    }
  })

  test('guard is applied to exactly 4 routes across the codebase', () => {
    const total = [orders, wallet, withdrawal]
      .join('\n')
      .split('\n')
      .filter(l => l.includes('storeReviewerGuard') && l.includes('.post(')).length
    assert.equal(total, 4)
  })
})

// ── E/F. the creation script writes no money and no financial records ──────
describe('E/F. creation script safety', () => {
  const script = read('scripts/create-apple-review-account.ts')

  test('E. wallet is created at exactly 0 and never overwritten', () => {
    assert.match(script, /cashBalance:\s*0/)
    assert.match(script, /update:\s*\{\}/, 'existing balance must never be overwritten')
    assert.ok(!/cashBalance:\s*(?!0)\d/.test(script), 'no non-zero balance anywhere')
  })

  test('F. script creates no holdings, orders, deposits or withdrawals', () => {
    for (const model of ['holding', 'order', 'depositRequest', 'withdrawalRequest']) {
      const created = new RegExp(`prisma\\.${model}\\.(create|upsert|createMany)`)
      assert.ok(!created.test(script), `script must not create ${model} records`)
      assert.ok(new RegExp(`prisma\\.${model}\\.count`).test(script), `script should verify ${model} count`)
    }
  })

  test('password comes from env, is never hardcoded and never printed', () => {
    assert.match(script, /process\.env\.APPLE_REVIEW_PASSWORD/)
    assert.ok(!/password\s*=\s*['"][^'"]{6,}['"]/i.test(script), 'no hardcoded password literal')

    // Strip string literals first, so a reassuring message such as
    // "(password not shown)" is not mistaken for logging the value itself.
    // What matters is whether the `password` IDENTIFIER reaches a console call.
    const codeOnly = script
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    const consoleCalls = codeOnly.match(/console\.\w+\([\s\S]*?\)/g) ?? []
    for (const call of consoleCalls) {
      assert.ok(
        !/\bpassword\b|\bpasswordHash\b/.test(call),
        `password value must never be logged: ${call}`
      )
    }
    assert.match(script, /password not shown/i)
  })

  test('role is INVESTOR only and refuses to modify a non-INVESTOR row', () => {
    assert.match(script, /role:\s*'INVESTOR'/)
    assert.match(script, /Refusing to modify/)
    assert.ok(!/'ADMIN'|'OWNER'|'REGULATOR'/.test(script.replace(/existing\.role/g, '')) ||
      /existing\.role !== 'INVESTOR'/.test(script))
  })

  test('no phone number is invented', () => {
    assert.ok(!/phoneNumber:\s*['"]/.test(script), 'must not invent a phone number')
    assert.match(script, /phoneVerified is intentionally left false/)
  })
})

// ── schema/migration shape ─────────────────────────────────────────────────
describe('schema and migration', () => {
  test('flag defaults to false so no existing user is affected', () => {
    assert.match(read('prisma/schema.prisma'), /isStoreReviewer Boolean @default\(false\)/)
  })

  test('migration is additive only — no DROP or destructive DDL', () => {
    const sql = read('prisma/migrations/20260901120000_add_store_reviewer_flag/migration.sql')
    assert.match(sql, /ADD COLUMN "isStoreReviewer" BOOLEAN NOT NULL DEFAULT false/)
    assert.ok(!/\b(DROP|TRUNCATE|DELETE)\b/i.test(sql), 'migration must be non-destructive')
  })
})
