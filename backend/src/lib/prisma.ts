import { PrismaClient } from '@prisma/client'
import {
  AuthTokenPayload,
  AuthUser,
  SignupRequest,
  LoginRequest,
  AuthResponse,
  sanitizeSignupInput,
  hashPassword,
  comparePassword,
  generateJwt,
  verifyJwt,
  extractTokenFromHeader,
  validateEmail,
  validatePassword,
  validateTenantName,
  generateDisplayName,
  generateSecureToken,
  isJwtConfigSecure,
  getSecurityWarnings
} from './fabric'

// Create and export Prisma client instance
export const prisma = new PrismaClient()

// Re-export all functions from fabric.ts for backward compatibility
export {
  AuthTokenPayload,
  AuthUser,
  SignupRequest,
  LoginRequest,
  AuthResponse,
  sanitizeSignupInput,
  hashPassword,
  comparePassword,
  generateJwt,
  verifyJwt,
  extractTokenFromHeader,
  validateEmail,
  validatePassword,
  validateTenantName,
  generateDisplayName,
  generateSecureToken,
  isJwtConfigSecure,
  getSecurityWarnings
}

// Export configuration constants
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'
export const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')

export default {
  prisma,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  BCRYPT_SALT_ROUNDS,
  // Re-export all fabric functions for convenience
  sanitizeSignupInput,
  hashPassword,
  comparePassword,
  generateJwt,
  verifyJwt,
  extractTokenFromHeader,
  validateEmail,
  validatePassword,
  validateTenantName,
  generateDisplayName,
  generateSecureToken,
  isJwtConfigSecure,
  getSecurityWarnings
}