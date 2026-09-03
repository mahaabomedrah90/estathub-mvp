import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

/**
 * Blocks app-store review accounts (Apple App Review / Google Play) from
 * performing financial writes, while leaving every read path untouched.
 *
 * WHY A DATABASE LOOKUP AND NOT THE JWT
 * -------------------------------------
 * The access token is signed at login with { userId, email, role, tenantId,
 * fullName } and lives for JWT_EXPIRES_IN (default '1d'). If `isStoreReviewer`
 * were carried in the token, any token minted BEFORE the flag was set would
 * assert `false` and this guard would FAIL OPEN for the remainder of that
 * token's life — the reviewer could transact freely.
 *
 * This is a restriction, not a grant: a stale `false` is a security hole, while
 * a stale `true` is merely inconvenient. Restrictions must be evaluated against
 * current state, so we read the flag from the database on each protected call.
 *
 * The cost is one indexed primary-key lookup on four low-traffic write
 * endpoints. Read paths, listings and dashboards are never touched.
 *
 * FAIL BEHAVIOUR — CLOSED
 * -----------------------
 * If the lookup throws we return 503 and do NOT call next(). An authorization
 * decision that could not be evaluated must never be treated as "allowed" on a
 * financial write: failing open would let a reviewer transact simply because
 * the check errored.
 *
 * This costs legitimate investors nothing in practice. Every one of these four
 * handlers reads and writes through the same Prisma client, so if this lookup
 * cannot reach the database the handler could not have completed either — it
 * would fail deeper in, after partial work. Refusing early is both safer and
 * cleaner, and returns a retryable status rather than a misleading success.
 */

type UserFlagReader = {
  user: {
    findUnique(args: {
      where: { id: string }
      select: { isStoreReviewer: true }
    }): Promise<{ isStoreReviewer: boolean } | null>
  }
}

export function createStoreReviewerGuard(db: UserFlagReader) {
  return async function storeReviewerGuard(
    req: Request & { user?: { userId?: string } },
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const userId = req.user?.userId

    // Not authenticated (or auth middleware not yet run) — this guard has no
    // opinion; the route's own auth() will reject it.
    if (!userId) {
      next()
      return
    }

    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { isStoreReviewer: true },
      })

      if (user?.isStoreReviewer === true) {
        res.status(403).json({
          error: 'reviewer_account_readonly',
          message:
            'هذا الحساب مخصّص لمراجعة المتجر للاطّلاع فقط، ولا يمكنه تنفيذ عمليات مالية.',
        })
        return
      }

      next()
    } catch (err) {
      // Fail CLOSED: the reviewer check could not be evaluated, so the
      // financial write must not proceed. Retryable, and never a silent allow.
      console.error(
        '❌ storeReviewerGuard: reviewer-status lookup failed; blocking financial write.',
        err instanceof Error ? err.message : err
      )
      res.status(503).json({
        error: 'reviewer_check_unavailable',
        message: 'تعذّر التحقّق من صلاحية الحساب حالياً. يرجى المحاولة لاحقاً.',
      })
    }
  }
}

export const storeReviewerGuard = createStoreReviewerGuard(prisma as unknown as UserFlagReader)

export default storeReviewerGuard
