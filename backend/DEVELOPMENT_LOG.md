# Backend Development Log

## 2026-06-27 — KYC gate added to POST /api/orders (compliance-critical)

**File:** `src/controllers/orders.controller.ts`

**Problem:** The investment purchase endpoint `POST /api/orders` did not enforce KYC
verification. A test investor with `kycVerified: false` was able to successfully create
an order and proceed to payment confirmation.

**Fix:** Added a KYC check immediately after the account suspension check (~line 82).
The existing `prisma.user.findUnique` call was extended to also select `kycVerified`.
If the field is `false` (or absent), the endpoint now returns:

```json
HTTP 403
{
  "error": "kyc_required",
  "message": "يجب إتمام التحقق من الهوية (KYC) قبل الاستثمار."
}
```

**Field confirmed:** `kycVerified` (boolean) on the `User` model — verified against
`/api/auth/me` response in production schema.

**Status:** Code fixed. NOT deployed. Requires QA sign-off and compliance review before
release to production investor-facing environment.
