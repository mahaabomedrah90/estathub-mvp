import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'
const { PrismaClient, Role, PropertyStatus } = pkg

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Estathub seeding with authentication and multi-tenant support...')

  // === Tenants ===
  let defaultTenant = await prisma.tenant.findFirst({
    where: { name: 'Default Tenant' }
  })
  
  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: { name: 'Default Tenant' }
    })
  }

  let demoTenant = await prisma.tenant.findFirst({
    where: { name: 'Demo Real Estate Company' }
  })
  
  if (!demoTenant) {
    demoTenant = await prisma.tenant.create({
      data: { name: 'Demo Real Estate Company' }
    })
  }

  console.log('✅ Created tenants:', [defaultTenant.name, demoTenant.name])

  // === Password Hashing ===
  const defaultPassword = 'Demo123!'
  const passwordHash = await bcrypt.hash(defaultPassword, 12)

  // === Users ===
  const admin = await prisma.user.upsert({
    where: { email: 'admin@estathub.local' },
    update: { 
      passwordHash,
      tenantId: defaultTenant.id 
    },
    create: { 
      email: 'admin@estathub.local', 
      name: 'System Admin', 
      role: Role.ADMIN,
      passwordHash,
      tenantId: defaultTenant.id 
    },
  })

  const investor = await prisma.user.upsert({
    where: { email: 'investor@estathub.local' },
    update: { 
      passwordHash,
      tenantId: defaultTenant.id 
    },
    create: { 
      email: 'investor@estathub.local', 
      name: 'Demo Investor', 
      role: Role.INVESTOR,
      passwordHash,
      tenantId: defaultTenant.id 
    },
  })

  const owner = await prisma.user.upsert({
    where: { email: 'owner@estathub.local' },
    update: { 
      passwordHash,
      tenantId: demoTenant.id 
    },
    create: { 
      email: 'owner@estathub.local', 
      name: 'Property Owner', 
      role: Role.OWNER,
      passwordHash,
      tenantId: demoTenant.id 
    },
  })

  // === Properties ===
  const property1 = await prisma.property.upsert({
    where: { id: 'property-1' },
    update: {},
    create: {
    id: 'property-1',
      title: 'Riyadh Rental – Tower Floor 5',
      description: 'Luxury office space in Riyadh city center with consistent rental income.',
      totalValue: 5000000.0,
      tokenPrice: 1000.0,
      totalTokens: 5000,
      remainingTokens: 4800,
      monthlyYield: 0.9,
      status: PropertyStatus.APPROVED,
 ownerId: owner.id,
 tenantId: demoTenant.id,
    },
  })

  const property2 = await prisma.property.upsert({
    where: { id: 'property-2' },
    update: {},
    create: {
    id: 'property-2',
      title: 'Jeddah Retail – Shop #12',
      description: 'Prime retail space near the Corniche area with stable tenants.',
      totalValue: 3000000.0,
      tokenPrice: 1000.0,
      totalTokens: 3000,
      remainingTokens: 2900,
      monthlyYield: 1.1,
      status: PropertyStatus.APPROVED,
      ownerId: owner.id,
      tenantId: demoTenant.id,
    },
  })

  // === Sample Investment Orders ===
  console.log('💰 Creating sample investment orders...')
  
  // Create wallets for investors
  const investorWallet = await prisma.wallet.upsert({
    where: { userId: investor.id },
    update: { cashBalance: 100000 },
    create: {
      userId: investor.id,
      tenantId: defaultTenant.id,
      cashBalance: 100000,
    },
  })

  // Sample investment orders for the investor
  const order1 = await prisma.order.create({
    data: {
      userId: investor.id,
      propertyId: property1.id,
      tokens: 50,
      amount: 50000, // 50 tokens * 1000 SAR each
      status: 'COMPLETED',
      transactionHash: '0xabc123def456789...',
      blockchainConfirmed: true,
    },
  })

  const order2 = await prisma.order.create({
    data: {
      userId: investor.id,
      propertyId: property2.id,
      tokens: 25,
      amount: 25000, // 25 tokens * 1000 SAR each
      status: 'COMPLETED',
      transactionHash: '0xdef789ghi012345...',
      blockchainConfirmed: true,
    },
  })

  // Create holdings for the investor
  await prisma.holding.upsert({
    where: { userId_propertyId: { userId: investor.id, propertyId: property1.id } },
    update: { tokens: 50 },
    create: {
      userId: investor.id,
      propertyId: property1.id,
      tokens: 50,
    },
  })

  await prisma.holding.upsert({
    where: { userId_propertyId: { userId: investor.id, propertyId: property2.id } },
    update: { tokens: 25 },
    create: {
      userId: investor.id,
      propertyId: property2.id,
      tokens: 25,
    },
  })

  // Create certificates
  await prisma.certificate.create({
    data: {
      code: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: investor.id,
      propertyId: property1.id,
      orderId: order1.id,
      blockchainTxId: order1.transactionHash,
    },
  })

  await prisma.certificate.create({
    data: {
      code: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: investor.id,
      propertyId: property2.id,
      orderId: order2.id,
      blockchainTxId: order2.transactionHash,
    },
  })

  // Create additional investors with investments
  const investor2 = await prisma.user.upsert({
    where: { email: 'fatima@investor.local' },
    update: { passwordHash, tenantId: defaultTenant.id },
    create: {
      email: 'fatima@investor.local',
      name: 'Fatima Al-Harbi',
      role: Role.INVESTOR,
      passwordHash,
      tenantId: defaultTenant.id,
      verified: true,
      phone: '+966 55 234 5678',
    },
  })

  const investor2Wallet = await prisma.wallet.upsert({
    where: { userId: investor2.id },
    update: { cashBalance: 75000 },
    create: {
      userId: investor2.id,
      tenantId: defaultTenant.id,
      cashBalance: 75000,
    },
  })

  const order3 = await prisma.order.create({
    data: {
      userId: investor2.id,
      propertyId: property1.id,
      tokens: 30,
      amount: 30000,
      status: 'COMPLETED',
      transactionHash: '0xghi456jkl789012...',
      blockchainConfirmed: true,
    },
  })

  await prisma.holding.upsert({
    where: { userId_propertyId: { userId: investor2.id, propertyId: property1.id } },
    update: { tokens: 30 },
    create: {
      userId: investor2.id,
      propertyId: property1.id,
      tokens: 30,
    },
  })

  await prisma.certificate.create({
    data: {
      code: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: investor2.id,
      propertyId: property1.id,
      orderId: order3.id,
      blockchainTxId: order3.transactionHash,
    },
  })

  // === Logs ===
console.log('✅ Seeded tenants:', {
 default: defaultTenant.name,
 demo: demoTenant.name,
 })
 console.log('✅ Seeded users with passwords:', {
 admin: { email: admin.email, role: admin.role, tenant: defaultTenant.name },
 investor: { email: investor.email, role: investor.role, tenant: defaultTenant.name },
 investor2: { email: investor2.email, role: investor2.role, tenant: defaultTenant.name },
 owner: { email: owner.email, role: owner.role, tenant: demoTenant.name },
 })
 console.log('🏘️ Seeded properties:', [
 { title: property1.title, tenant: demoTenant.name },
 { title: property2.title, tenant: demoTenant.name }
 ])
 console.log('💰 Seeded investment orders:', [
 { investor: investor.email, property: property1.title, amount: order1.amount, tokens: order1.tokens },
 { investor: investor.email, property: property2.title, amount: order2.amount, tokens: order2.tokens },
 { investor: investor2.email, property: property1.title, amount: order3.amount, tokens: order3.tokens },
 ])
 console.log('🔐 Default password for all users:', defaultPassword)
 console.log('🔑 JWT Secret configured:', !!process.env.JWT_SECRET)
}

main()
  .then(async () => {
    console.log('🌿 Seeding complete!')
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
