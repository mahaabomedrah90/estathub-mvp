import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import {
  validateEmail,
  normalizeEmail,
  validatePhone,
  validateNationalId,
  validatePassword,
  validateFullName,
  validateTermsAccepted,
  maskNationalId,
  sanitizeForLog,
  validationErrorMessages
} from '../lib/validators'

export const authRouter = Router()
export const usersRouter = Router()

type Role = 'INVESTOR' | 'OWNER' | 'ADMIN' | 'REGULATOR'

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

// Register rate limiter: 5 attempts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many registration attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
})

// Login rate limiter: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// ============================================================================
// Helper Functions
// ============================================================================

async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, BCRYPT_SALT_ROUNDS)
}

async function comparePassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  return await bcrypt.compare(plain, hash)
}

function signToken(user: {
  id: string
  email: string
  role: Role
  tenantId: string
  fullName: string | null
}) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      fullName: user.fullName
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    } as any
  )
}

function getErrorMessage(errorCode: string, lang: 'en' | 'ar' = 'en'): string {
  const message = validationErrorMessages[errorCode]
  return message ? message[lang] : errorCode
}

function sanitizeUserForResponse(user: any) {
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    tenantId: user.tenantId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    kycVerified: user.kycVerified,
    nationalId: user.nationalId ? maskNationalId(user.nationalId) : null,
    phoneNumber: user.phoneNumber
      ? user.phoneNumber.slice(0, -6) + '***' + user.phoneNumber.slice(-3)
      : null,
    address: user.address
  }
}

// ============================================================================
// POST /api/auth/register - User Registration
// ============================================================================

authRouter.post('/register', registerLimiter, async (req: Request, res: Response) => {
  console.log('🔐 Registration request received:', sanitizeForLog(req.body))

  try {
    const {
      fullName,
      email,
      phoneNumber,
      nationalId,
      password,
      confirmPassword,
      role,
      termsAccepted
    } = req.body

    const lang = (req.headers['accept-language']?.includes('ar') ? 'ar' : 'en') as 'en' | 'ar'

    // Validate Terms Acceptance
    const termsValidation = validateTermsAccepted(termsAccepted === true)
    if (!termsValidation.valid) {
      return res.status(400).json({
        error: termsValidation.error,
        message: getErrorMessage(termsValidation.error!, lang)
      })
    }

    // Validate Full Name
    const nameValidation = validateFullName(fullName)
    if (!nameValidation.valid) {
      return res.status(400).json({
        error: nameValidation.error,
        message: getErrorMessage(nameValidation.error!, lang),
        field: 'fullName'
      })
    }
    const normalizedFullName = nameValidation.normalized!

    // Validate Email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return res.status(400).json({
        error: emailValidation.error,
        message: getErrorMessage(emailValidation.error!, lang),
        field: 'email'
      })
    }
    const normalizedEmail = normalizeEmail(email)

    // Validate Phone
    const phoneValidation = validatePhone(phoneNumber)
    if (!phoneValidation.valid) {
      return res.status(400).json({
        error: phoneValidation.error,
        message: getErrorMessage(phoneValidation.error!, lang),
        field: 'phoneNumber'
      })
    }
    const normalizedPhone = phoneValidation.normalized!

    // Validate National ID
    const nationalIdValidation = validateNationalId(nationalId)
    if (!nationalIdValidation.valid) {
      return res.status(400).json({
        error: nationalIdValidation.error,
        message: getErrorMessage(nationalIdValidation.error!, lang),
        field: 'nationalId'
      })
    }

    // Validate Password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'password_validation_failed',
        errors: passwordValidation.errors,
        messages: passwordValidation.errors.map(e => getErrorMessage(e, lang)),
        field: 'password',
        strength: passwordValidation.strength
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'password_mismatch',
        message: getErrorMessage('password_mismatch', lang),
        field: 'confirmPassword'
      })
    }

    // Check existing users
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })
    if (existingUserByEmail) {
      return res.status(409).json({
        error: 'email_already_exists',
        message: getErrorMessage('email_already_exists', lang),
        field: 'email'
      })
    }

    const existingUserByPhone = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone }
    })
    if (existingUserByPhone) {
      return res.status(409).json({
        error: 'phone_already_exists',
        message: getErrorMessage('phone_already_exists', lang),
        field: 'phoneNumber'
      })
    }

    const existingUserByNationalId = await prisma.user.findFirst({
      where: { nationalId: nationalId.trim() }
    })
    if (existingUserByNationalId) {
      return res.status(409).json({
        error: 'national_id_already_exists',
        message: getErrorMessage('national_id_already_exists', lang),
        field: 'nationalId'
      })
    }

    // Get or create default tenant
    let tenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    })

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: 'Default Tenant' }
      })
    }

    // Hash Password
    const passwordHash = await hashPassword(password)

    // Create User
    const userRole = role && ['INVESTOR', 'OWNER', 'ADMIN', 'REGULATOR'].includes(role.toUpperCase())
      ? role.toUpperCase() as Role
      : 'INVESTOR'

    const user = await prisma.user.create({
      data: {
        fullName: normalizedFullName,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        nationalId: nationalId.trim(),
        passwordHash,
        role: userRole,
        tenantId: tenant.id,
        emailVerified: false,
        phoneVerified: false,
        kycVerified: false
      },
      include: { tenant: true }
    })

    console.log('✅ User registered successfully:', { userId: user.id, email: user.email })

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      tenantId: user.tenantId,
      fullName: user.fullName
    })

    return res.status(201).json({
      message: 'registration_success',
      token,
      user: sanitizeUserForResponse(user)
    })

  } catch (error: any) {
    console.error('❌ Registration error:', error.message)
    return res.status(500).json({
      error: 'registration_failed',
      message: 'An unexpected error occurred. Please try again later.'
    })
  }
})

// ============================================================================
// POST /api/auth/login - User Login (Email or Phone + Password)
// ============================================================================

authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const logBody = { ...req.body }
  if (logBody.password) logBody.password = '[REDACTED]'
  console.log('🔐 Login request received:', logBody)

  try {
    const { email, phoneNumber, password } = req.body
    const lang = (req.headers['accept-language']?.includes('ar') ? 'ar' : 'en') as 'en' | 'ar'

    if (!password) {
      return res.status(400).json({
        error: 'password_required',
        message: getErrorMessage('password_required', lang)
      })
    }

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: 'email_or_phone_required',
        message: lang === 'ar'
          ? 'البريد الإلكتروني أو رقم الجوال مطلوب'
          : 'Email or phone number is required'
      })
    }

    let user = null

    if (email) {
      const emailValidation = validateEmail(email)
      if (!emailValidation.valid) {
        return res.status(400).json({
          error: emailValidation.error,
          message: getErrorMessage(emailValidation.error!, lang)
        })
      }
      const normalizedEmail = normalizeEmail(email)
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { tenant: true }
      })
    } else if (phoneNumber) {
      const phoneValidation = validatePhone(phoneNumber)
      if (!phoneValidation.valid) {
        return res.status(400).json({
          error: phoneValidation.error,
          message: getErrorMessage(phoneValidation.error!, lang)
        })
      }
      const normalizedPhone = phoneValidation.normalized!
      user = await prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone },
        include: { tenant: true }
      })
    }

    if (!user) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: getErrorMessage('invalid_credentials', lang)
      })
    }

    const passwordValid = await comparePassword(password, user.passwordHash)
    if (!passwordValid) {
      console.log('❌ Login failed: invalid password for user:', user.id)
      return res.status(401).json({
        error: 'invalid_credentials',
        message: getErrorMessage('invalid_credentials', lang)
      })
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email, role: user.role })

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      tenantId: user.tenantId,
      fullName: user.fullName
    })

    return res.status(200).json({
      token,
      user: sanitizeUserForResponse(user)
    })

  } catch (error: any) {
    console.error('❌ Login error:', error.message)
    return res.status(500).json({
      error: 'login_failed',
      message: 'An unexpected error occurred. Please try again later.'
    })
  }
})

// ============================================================================
// Stub endpoints for Phase 2
// ============================================================================

authRouter.post('/verify-email', async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'not_implemented',
    message: 'Email verification will be available in Phase 2'
  })
})

authRouter.post('/verify-phone', async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'not_implemented',
    message: 'Phone verification via SMS will be available in Phase 2'
  })
})

authRouter.post('/resend-otp', async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'not_implemented',
    message: 'OTP resend will be available in Phase 2'
  })
})

authRouter.post('/forgot-password', async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'not_implemented',
    message: 'Password reset will be available in Phase 2'
  })
})

// ============================================================================
// Legacy signup endpoint (redirects to /register with mapped fields)
// ============================================================================

authRouter.post('/signup', registerLimiter, async (req: Request, res: Response) => {
  req.body.fullName = req.body.name || req.body.fullName
  req.body.termsAccepted = true

  // Forward to register handler
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      role
    } = req.body

    const lang = (req.headers['accept-language']?.includes('ar') ? 'ar' : 'en') as 'en' | 'ar'

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }

    const nameValidation = validateFullName(fullName)
    if (!nameValidation.valid) {
      return res.status(400).json({
        error: nameValidation.error,
        message: getErrorMessage(nameValidation.error!, lang)
      })
    }

    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return res.status(400).json({
        error: emailValidation.error,
        message: getErrorMessage(emailValidation.error!, lang)
      })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'password_validation_failed',
        errors: passwordValidation.errors
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'password_mismatch' })
    }

    const normalizedEmail = normalizeEmail(email)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return res.status(409).json({ error: 'email_already_exists' })
    }

    let tenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    })
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: 'Default Tenant' }
      })
    }

    const passwordHash = await hashPassword(password)
    const userRole = role && ['INVESTOR', 'OWNER', 'ADMIN', 'REGULATOR'].includes(role.toUpperCase())
      ? role.toUpperCase() as Role
      : 'INVESTOR'

    const user = await prisma.user.create({
      data: {
        fullName: nameValidation.normalized!,
        email: normalizedEmail,
        passwordHash,
        role: userRole,
        tenantId: tenant.id,
        emailVerified: false,
        phoneVerified: false,
        kycVerified: false
      },
      include: { tenant: true }
    })

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      tenantId: user.tenantId,
      fullName: user.fullName
    })

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: sanitizeUserForResponse(user)
    })

  } catch (error: any) {
    console.error('❌ Signup error:', error.message)
    return res.status(500).json({ error: 'signup_failed' })
  }
})

// ============================================================================
// Users Management Endpoints
// ============================================================================

usersRouter.get('/', auth(true), async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'admin_access_required' })
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            holdings: true,
            orders: true,
            certificates: true
          }
        }
      }
    })

    const ownerIds = users.map((u: any) => u.id)
    const propertyCounts = await prisma.property.groupBy({
      by: ['ownerId'],
      where: {
        ownerId: { in: ownerIds }
      },
      _count: {
        id: true
      }
    })

    const propertyCountMap = propertyCounts.reduce((acc: Record<string, number>, item: any) => {
      if (item.ownerId) {
        acc[item.ownerId] = item._count.id
      }
      return acc
    }, {} as Record<string, number>)

    const mappedUsers = users.map((user: any) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phoneNumber ? maskNationalId(user.phoneNumber) : 'Not provided',
      nationalId: user.nationalId ? maskNationalId(user.nationalId) : 'Not provided',
      role: user.role.toLowerCase(),
      status: user.kycVerified ? 'Verified' : 'Pending Verification',
      joinedDate: user.createdAt.toISOString().split('T')[0],
      properties: propertyCountMap[user.id] || 0,
      investments: user._count.holdings,
      orders: user._count.orders,
      certificates: user._count.certificates,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycVerified: user.kycVerified
    }))

    console.log(`👥 Fetched ${mappedUsers.length} users from database`)
    res.json(mappedUsers)
  } catch (error) {
    console.error('❌ Failed to fetch users:', error)
    res.status(500).json({ error: 'failed_to_fetch_users' })
  }
})

usersRouter.patch('/:id/role', auth(true), async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'admin_access_required' })
    }

    const { id } = req.params
    const { role } = req.body

    if (!id || !role) {
      return res.status(400).json({ error: 'user_id_and_role_required' })
    }

    const validRoles = ['ADMIN', 'INVESTOR', 'OWNER', 'REGULATOR']
    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'invalid_role' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role.toUpperCase() as Role }
    })

    console.log(`🔄 Updated user ${id} role to ${role}`)
    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role.toLowerCase()
      }
    })
  } catch (error) {
    console.error('❌ Failed to update user role:', error)
    res.status(500).json({ error: 'failed_to_update_user_role' })
  }
})

usersRouter.patch('/:id/verification', auth(true), async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'admin_access_required' })
    }

    const { id } = req.params
    const { emailVerified, phoneVerified, kycVerified } = req.body

    const updateData: any = {}
    if (typeof emailVerified === 'boolean') updateData.emailVerified = emailVerified
    if (typeof phoneVerified === 'boolean') updateData.phoneVerified = phoneVerified
    if (typeof kycVerified === 'boolean') updateData.kycVerified = kycVerified

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    })

    console.log(`🔄 Updated user ${id} verification status`)
    res.json({
      success: true,
      message: 'User verification status updated',
      user: sanitizeUserForResponse(updatedUser)
    })
  } catch (error) {
    console.error('❌ Failed to update user verification status:', error)
    res.status(500).json({ error: 'failed_to_update_user_verification' })
  }
})

export default authRouter
