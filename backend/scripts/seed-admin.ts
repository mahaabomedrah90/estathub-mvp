/**
 * Admin Seed Script
 * Creates the first admin user for platform setup
 * Usage: npx ts-node scripts/seed-admin.ts
 * 
 * SECURITY NOTE: This script should only be run during initial setup
 * and never exposed in the frontend UI.
 */

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedAdmin() {
  console.log('🌱 Starting admin seed...')

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@alwasm.sa'
  const adminPhone = process.env.ADMIN_PHONE || '+966501234567'
  const adminNationalId = process.env.ADMIN_NATIONAL_ID || '1000000001'
  const adminFullName = process.env.ADMIN_FULL_NAME || 'System Administrator'
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD environment variable is required')
    console.log('Usage: ADMIN_PASSWORD=yourSecurePassword npx ts-node scripts/seed-admin.ts')
    process.exit(1)
  }

  // Validate password strength
  if (adminPassword.length < 10) {
    console.error('❌ Admin password must be at least 10 characters')
    process.exit(1)
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists:', existingAdmin.email)
      console.log('If you need to create a new admin, use the API or database directly.')
      process.exit(0)
    }

    // Get or create default tenant
    let tenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    })

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: 'Default Tenant' }
      })
      console.log('✅ Created default tenant:', tenant.id)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        fullName: adminFullName,
        phoneNumber: adminPhone,
        nationalId: adminNationalId,
        passwordHash,
        role: 'ADMIN',
        tenantId: tenant.id,
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log({
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      tenantId: admin.tenantId
    })
    console.log('\n🔐 IMPORTANT: Store the admin credentials securely.')
    console.log('This is the only time the password is shown in plain text.')

  } catch (error) {
    console.error('❌ Failed to seed admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedAdmin()
