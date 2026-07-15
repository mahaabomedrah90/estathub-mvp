import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'
const { PrismaClient } = pkg

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://alwsm:alwsm_local_test@localhost:5435/alwsm_local' } }
})

async function main() {
  const hash = await bcrypt.hash('Test1234!', 10)

  // Tenants
  const defaultTenant = await prisma.tenant.upsert({
    where: { id: 'tenant-default' },
    update: {},
    create: { id: 'tenant-default', name: 'Default Tenant' }
  })
  const demoTenant = await prisma.tenant.upsert({
    where: { id: 'tenant-demo' },
    update: {},
    create: { id: 'tenant-demo', name: 'Demo Real Estate Company' }
  })

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@local.test' },
    update: { passwordHash: hash },
    create: {
      email: 'admin@local.test', fullName: 'Local Admin',
      role: 'ADMIN', passwordHash: hash, tenantId: defaultTenant.id,
      nationalId: '1000000001', phoneNumber: '+966500000001'
    }
  })

  // Investor (low balance — for insufficient balance test)
  const investor = await prisma.user.upsert({
    where: { email: 'investor@local.test' },
    update: { passwordHash: hash },
    create: {
      email: 'investor@local.test', fullName: 'Test Investor',
      role: 'INVESTOR', passwordHash: hash, tenantId: defaultTenant.id,
      nationalId: '1000000002', phoneNumber: '+966500000002'
    }
  })

  // Investor wallet: 200 SAR (insufficient for 500 SAR purchase)
  await prisma.wallet.upsert({
    where: { userId: investor.id },
    update: { cashBalance: 200 },
    create: { userId: investor.id, tenantId: defaultTenant.id, cashBalance: 200 }
  })

  // Owner
  const owner = await prisma.user.upsert({
    where: { email: 'owner@local.test' },
    update: { passwordHash: hash },
    create: {
      email: 'owner@local.test', fullName: 'Test Owner',
      role: 'OWNER', passwordHash: hash, tenantId: demoTenant.id,
      nationalId: '1000000003', phoneNumber: '+966500000003'
    }
  })

  // Test property: tokenPrice=100, totalTokens=1000, remainingTokens=1000
  const property = await prisma.property.upsert({
    where: { id: 'prop-local-test' },
    update: {},
    create: {
      id: 'prop-local-test',
      title: 'عقار تجريبي للاختبار',
      location: 'الرياض، المملكة العربية السعودية',
      description: 'عقار للاختبار المحلي',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
      images: [],
      totalValue: 100000,
      tokenPrice: 100,
      totalTokens: 1000,
      remainingTokens: 1000,
      monthlyYield: 1.0,
      expectedROI: 12.0,
      status: 'APPROVED',
      ownerId: owner.id,
      tenantId: demoTenant.id,
      approvedAt: new Date(),
      city: 'الرياض',
    }
  })

  console.log('✅ Local test seed complete')
  console.log('Users (password: Test1234!):')
  console.log('  admin@local.test    → ADMIN')
  console.log('  investor@local.test → INVESTOR (wallet: 200 SAR)')
  console.log('  owner@local.test    → OWNER')
  console.log('Property:', property.id, '→ tokenPrice=100, remainingTokens=1000')
  console.log('Admin ID:', admin.id)
  console.log('Investor ID:', investor.id)
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1) })
