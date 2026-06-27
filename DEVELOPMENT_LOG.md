# Development Log

## 2026-06-27 — Deed privacy fix (SECURITY)

**Severity:** High — data privacy breach  
**Affected endpoints:** `GET /api/deeds` and `GET /api/deeds/:deedNumber`  
**File:** `backend/src/controllers/deed.controller.ts`

### Issue

During production smoke test on 2026-06-27, a test investor account was able to see deed `DEED-2026-00002` belonging to `maha@drovox.com` via `GET /api/deeds`. Any authenticated investor could enumerate all users' deed records. The single-deed endpoint `GET /api/deeds/:deedNumber` had the same problem — no ownership check after retrieval.

### Fix

**`GET /api/deeds`** — Added role-aware scoping to the `where` clause:
- Non-privileged users (investors) now always get `where.userId = req.user.userId`, regardless of query params.
- ADMIN / REGULATOR roles retain the ability to filter by an arbitrary `userId` query param or see all.

**`GET /api/deeds/:deedNumber`** — Added post-retrieval ownership check:
- After the Prisma lookup, non-privileged callers receive `403 forbidden` if `deed.userId !== req.user.userId`.

### Status

Code fixed. **Not deployed.** Requires review before release.
