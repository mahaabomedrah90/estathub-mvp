/**
 * reset-admin.ts
 *
 * One-time safe script to create or restore an ADMIN user.
 *
 * Usage (local):
 *   ADMIN_EMAIL=admin@alwsm.sa ADMIN_PASSWORD=YourStrongPass! npx tsx scripts/reset-admin.ts
 *
 * Usage (production / ECS):
 *   Run as a one-off ECS task with the env vars injected via ECS task override:
 *   ADMIN_EMAIL=admin@alwsm.sa ADMIN_PASSWORD=YourStrongPass! node dist/scripts/reset-admin.js
 *
 * What it does:
 *   - Finds the user by ADMIN_EMAIL.
 *   - If found:  sets role=ADMIN and updates the password hash.
 *   - If not found: creates a new ADMIN user in the default tenant.
 *   - Never prints the password. Exits with code 1 on any error.
 */

import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

// ── Config ────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL    = (process.env.ADMIN_EMAIL    || '').trim().toLowerCase()
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim()
const SALT_ROUNDS    = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)

// ── Validation ────────────────────────────────────────────────────────────────

if (!ADMIN_EMAIL) {
  console.error('❌  ADMIN_EMAIL env var is required.')
  process.exit(1)
}

if (!ADMIN_EMAIL.includes('@')) {
  console.error('❌  ADMIN_EMAIL does not look like a valid email address.')
  process.exit(1)
}

if (!ADMIN_PASSWORD) {
  console.error('❌  ADMIN_PASSWORD env var is required.')
  process.exit(1)
}

if (ADMIN_PASSWORD.length < 8) {
  console.error('❌  ADMIN_PASSWORD must be at least 8 characters.')
  process.exit(1)
}

// ── Main ─────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

async function main() {
  console.log(`\n🔐  Admin reset — target email: ${ADMIN_EMAIL}`)
  console.log(`   bcrypt rounds: ${SALT_ROUNDS}`)

  // Hash password — never stored or logged in plain text
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS)

  // Resolve tenant: use the first existing tenant, or create a default one
  let tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!tenant) {
    console.log('   No tenant found — creating default tenant...')
    tenant = await prisma.tenant.create({
      data: { name: 'Default Tenant' }
    })
    console.log(`✅  Created tenant: ${tenant.name} (${tenant.id})`)
  } else {
    console.log(`   Using tenant: ${tenant.name} (${tenant.id})`)
  }

  // Find user by email
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })

  if (existing) {
    // Update: promote to ADMIN and reset password
    const updated = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        role:         'ADMIN',
        passwordHash,
        // Ensure fullName is set if it was missing (seed.js bug used 'name' field)
        fullName:     existing.fullName ?? 'Admin',
      },
    })

    console.log(`\n✅  Admin user updated.`)
    console.log(`   ID:    ${updated.id}`)
    console.log(`   Email: ${updated.email}`)
    console.log(`   Role:  ${updated.role}`)
    console.log(`   Tenant: ${updated.tenantId}`)
  } else {
    // Create new admin user
    const created = await prisma.user.create({
      data: {
        email:        ADMIN_EMAIL,
        fullName:     'Admin',
        role:         'ADMIN',
        passwordHash,
        tenantId:     tenant.id,
      },
    })

    console.log(`\n✅  Admin user created.`)
    console.log(`   ID:    ${created.id}`)
    console.log(`   Email: ${created.email}`)
    console.log(`   Role:  ${created.role}`)
    console.log(`   Tenant: ${created.tenantId}`)
  }

  console.log('\n🎉  Done. You can now log in with the email and password you set.')
}

main()
  .catch((err) => {
    console.error('\n❌  Admin reset failed:', err.message || err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
