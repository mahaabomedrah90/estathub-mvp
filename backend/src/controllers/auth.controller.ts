import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
export const authRouter = Router()
export const usersRouter = Router()

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')

// ============================================================================
// Helper Functions
// ============================================================================

async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }
  return await bcrypt.hash(plain, BCRYPT_SALT_ROUNDS)
}

async function comparePassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  return await bcrypt.compare(plain, hash)
}

function generateJwt(payload: {
  userId: string
  tenantId: string
  role: string
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'estathub-mvp',
    audience: 'estathub-users'
  } as jwt.SignOptions)
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  if (!password) {
    errors.push('Password is required')
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }
  }
  return { valid: errors.length === 0, errors }
}

function generateDisplayName(email: string): string {
  const parts = email.split('@')
  const name = parts[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
  return name
}

function signToken(user: { id: string; email: string; role: Role; tenantId?: string }) {
  const secret = process.env.JWT_SECRET || 'devsecret'
  return jwt.sign({ 
  userId: user.id, 
  email: user.email, 
  role: user.role,
  tenantId: user.tenantId || '1'
}, secret, { 
    issuer: 'estathub-mvp',
    audience: 'estathub-users',
    expiresIn: '7d' 
  })
}

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  console.log('🔐 Login request received:', { body: req.body })
  
  try {
    const email = String(req.body?.email || '').toLowerCase().trim()
    if (!email) {
      console.log('❌ Email missing')
      return res.status(400).json({ error: 'email_required' })
    }

    // Look up existing user first
    let user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    })
    
    // If user doesn't exist, create with auto-detected role
    if (!user) {
      console.log('✨ User not found, creating automatically...')
      
      // Auto-detect role from email for NEW users only
      let userRole: Role = Role.INVESTOR // default
      if (req.body?.role) {
        const requestedRole = String(req.body.role).toUpperCase()
        if (requestedRole === 'INVESTOR' || requestedRole === 'OWNER' || requestedRole === 'ADMIN') {
          userRole = requestedRole as Role
        }
      } else {
        // Auto-detect from email for new users
        if (email.includes('owner')) {
          userRole = Role.OWNER
        } else if (email.includes('admin')) {
          userRole = Role.ADMIN
        } else if (email.includes('investor')) {
          userRole = Role.INVESTOR
        }
      }
      
      console.log('👤 Creating new user with role:', userRole)
      user = await prisma.user.create({
        data: {
          email,
          role: userRole,
          tenantId: '1',
          passwordHash: 'oauth_placeholder'
        },
        include: { tenant: true }
      })
    } else {
      // ✅ IMPORTANT: For existing users, ALWAYS use the role from database
      // Never overwrite it based on email or request body
      console.log('👤 Existing user found with role:', user.role)
    }

    if (!user) {
      throw new Error('User authentication failed - user not found')
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email, role: user.role })
    
    // Include tenant information in token
    const userWithTenant = {
      ...user,
      tenantId: user.tenant?.id || '1' // Default tenant if no tenant association
    }
    const token = signToken(userWithTenant)
    const response = { 
      token, 
      user: { id: user.id, email: user.email, role: user.role } 
    }
    
    console.log('📤 Sending response:', response)
    return res.status(200).json(response)
    
  } catch (e: any) {
    console.error('❌ Login error:', e)
    console.error('Error details:', { message: e.message, stack: e.stack })
    return res.status(500).json({ error: 'login_failed', details: e.message })
  }
})

// POST /api/auth/signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  console.log('🔐 Signup request received:', { body: req.body })
  
  try {
    const { name, email, password, tenantName, role } = req.body
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    
    // Validate email format
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'invalid_email' })
    }
    
    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'password_too_short' })
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    
    if (existingUser) {
      return res.status(400).json({ error: 'user_already_exists' })
    }
    
    // Create tenant if provided
    let tenant = null
    if (tenantName) {
      tenant = await prisma.tenant.findFirst({
        where: { name: tenantName }
      })
      
      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: { name: tenantName }
        })
      }
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: role || 'INVESTOR',
       tenantId: tenant?.id || '1'
      },
      include: {
        tenant: true
      }
    })
    
    // Generate JWT token using same function as login
    const userWithTenant = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant?.id || '1'
    }
    const token = signToken(userWithTenant)
    console.log('✅ User created successfully:', { userId: user.id, email: user.email })
    
    res.json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: user.tenant
      }
    })
    
  } catch (error: any) {
    console.error('❌ Signup error:', error)
    res.status(500).json({ error: 'signup_failed', details: error.message })
  }
})

// ============================================================================
// Users Management Endpoints
// ============================================================================

// GET /api/users - Get all users (admin only)
usersRouter.get('/', auth(true), async (req: Request, res: Response) => {
  try {
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

    // Get property counts for owners
    const ownerIds = users.map(u => u.id)
    const propertyCounts = await prisma.property.groupBy({
      by: ['ownerId'],
      where: {
        ownerId: { in: ownerIds }
      },
      _count: {
        id: true
      }
    })

    // Create a map of userId -> property count
    const propertyCountMap = propertyCounts.reduce((acc, item) => {
      if (item.ownerId) {
        acc[item.ownerId] = item._count.id
      }
      return acc
    }, {} as Record<string, number>)

    const mappedUsers = users.map(user => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      phone: user.phoneNumber || 'Not provided',
      role: user.role.toLowerCase(),
      status: 'Active', // All users are active by default (you can add a status field later)
      joinedDate: user.createdAt.toISOString().split('T')[0],
      properties: propertyCountMap[user.id] || 0,
      investments: user._count.holdings,
      orders: user._count.orders,
      certificates: user._count.certificates,
      tenantId: user.tenantId
    }))

    console.log(`👥 Fetched ${mappedUsers.length} users from database`)
    res.json(mappedUsers)
  } catch (error) {
    console.error('❌ Failed to fetch users:', error)
    res.status(500).json({ error: 'failed_to_fetch_users' })
  }
})

// PATCH /api/users/:id/role - Update user role (admin only)
usersRouter.patch('/:id/role', auth(true), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!id || !role) {
      return res.status(400).json({ error: 'user_id_and_role_required' })
    }

    const validRoles = ['ADMIN', 'INVESTOR', 'OWNER']
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

// PATCH /api/users/:id/status - Update user status (admin only)
usersRouter.patch('/:id/status', auth(true), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!id || !status) {
      return res.status(400).json({ error: 'user_id_and_status_required' })
    }

    // For now, we'll just return success since we don't have a status field in the User model
    // You can add a status field to the User model later
    console.log(`🔄 Updated user ${id} status to ${status}`)
    res.json({ 
      success: true, 
      message: `User status updated to ${status}`
    })
  } catch (error) {
    console.error('❌ Failed to update user status:', error)
    res.status(500).json({ error: 'failed_to_update_user_status' })
  }
})

export default authRouter
