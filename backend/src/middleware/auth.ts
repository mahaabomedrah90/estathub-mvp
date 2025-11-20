import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// ============================================================================
// Types
// ============================================================================

export interface AuthTokenPayload {
  userId: string
  tenantId: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthedRequest extends Request {
  user?: AuthTokenPayload
}

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// ============================================================================
// Middleware
// ============================================================================

/**
 * Authentication middleware that verifies JWT tokens and attaches user info to request
 * @param required - If false, middleware will pass through even without token
 */
export function auth(required: boolean = true) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    
    if (!token) {
      if (required) {
        return res.status(401).json({ 
          error: 'unauthorized',
          message: 'Authorization token required'
        })
      }
      return next()
    }
    
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        issuer: 'estathub-mvp',
        audience: 'estathub-users'
      }) as AuthTokenPayload
      
      // Attach user info to request
      req.user = payload
      return next()
      
    } catch (error: any) {
      console.error('❌ JWT verification failed:', error.message)
      
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          error: 'token_expired',
          message: 'Your session has expired. Please log in again.'
        })
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          error: 'invalid_token',
          message: 'Invalid authentication token.'
        })
      } else {
        return res.status(401).json({ 
          error: 'token_verification_failed',
          message: 'Failed to verify authentication token.'
        })
      }
    }
  }
}

/**
 * Role-based authorization middleware factory
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export function authorize(allowedRoles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Authentication required'
      })
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      })
    }
    
    next()
  }
}

/**
 * Tenant isolation middleware - ensures all queries are scoped by tenant
 * This should be used after auth middleware
 */
export function tenantIsolation(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'unauthorized',
      message: 'Authentication required for tenant access'
    })
  }
  
  // Attach tenantId to request for easy access in controllers
  req.tenantId = req.user.tenantId
  
  // Log tenant access for debugging
  console.log(`🏢 Tenant isolation: User ${req.user.userId} accessing tenant ${req.user.tenantId}`)
  
  next()
}

/**
 * Extend Express Request type to include tenantId
 */
declare global {
  namespace Express {
    interface Request {
      tenantId?: string
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract user ID from authenticated request
 */
export function getUserId(req: AuthedRequest): string {
  if (!req.user) {
    throw new Error('Request not authenticated')
  }
  return req.user.userId
}

/**
 * Extract tenant ID from authenticated request
 */
export function getTenantId(req: AuthedRequest): string {
  if (!req.user) {
    throw new Error('Request not authenticated')
  }
  return req.user.tenantId
}

/**
 * Check if user has specific role
 */
export function hasRole(req: AuthedRequest, role: string): boolean {
  return req.user?.role === role
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(req: AuthedRequest, roles: string[]): boolean {
  return req.user ? roles.includes(req.user.role) : false
}

// ============================================================================
// Export
// ============================================================================

export default auth
export { auth as authenticate }
