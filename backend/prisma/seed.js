import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'
const { PrismaClient, Role, PropertyStatus, OrderStatus } = pkg

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

  // === Test property for PropertyDetail page UI testing ===
  const propertyNada = await prisma.property.upsert({
    where: { id: 'property-burj-nada' },
    update: {},
    create: {
      id: 'property-burj-nada',
      title: 'برج الندى السكني الفاخر',
      location: 'الرياض، حي الياسمين، المملكة العربية السعودية',
      description: 'مجمع سكني حديث في شمال الرياض يتميز بموقع استراتيجي وقربه من الطرق الرئيسية والخدمات. فرصة مناسبة للمستثمرين الباحثين عن دخل عقاري دوري ونمو رأسمالي مستدام.',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80',
      images: [],
      totalValue: 10000000.0,
      tokenPrice: 100.0,
      totalTokens: 100000,
      remainingTokens: 25000,
      monthlyYield: 1.2,
      expectedROI: 14.4,
      status: PropertyStatus.APPROVED,
      ownerName: 'شركة إعمار نجد',
      ownerId: owner.id,
      tenantId: demoTenant.id,
      approvedAt: new Date(),
      propertyUsage: 'RESIDENTIAL',
      propertyTypeDetailed: 'مجمع سكني فاخر',
      city: 'الرياض',
      district: 'حي الياسمين',
      municipality: 'أمانة منطقة الرياض',
      landType: 'URBAN',
      landArea: 2500,
      builtArea: 1800,
      floorsCount: 5,
      unitsCount: 24,
      buildingAge: 0,
      propertyCondition: 'NEW',
      propertyDescription: 'مجمع سكني حديث في شمال الرياض يضم 24 وحدة سكنية موزعة على 5 طوابق، مع مواقف سيارات خاصة وحديقة مشتركة. يتميز بموقعه الاستراتيجي وقربه من الطرق الرئيسية والمدارس والمراكز التجارية. فرصة مناسبة للمستثمرين الباحثين عن دخل عقاري دوري ونمو رأسمالي مستدام في سوق الإسكان السعودي.',
      marketValue: 10000000.0,
      payoutSchedule: 'MONTHLY',
      ownerRetainedPercentage: 20,
      valuationReportUrl: 'https://example.com/valuation-report.pdf',
      deedDocumentUrl: 'https://example.com/title-deed.pdf',
      buildingPermitUrl: 'https://example.com/building-permit.pdf',
      sitePlanDocumentUrl: 'https://example.com/site-plan.pdf',
      declarationPropertyAccuracy: true,
      declarationLegalResponsibility: true,
      declarationTokenizationApproval: true,
      declarationDocumentSharingApproval: true,
    },
  })
  console.log('🏢 Test property ID:', propertyNada.id, '→ /properties/' + propertyNada.id)

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
      status: OrderStatus.PAID,
    },
  })

  const order2 = await prisma.order.create({
    data: {
      userId: investor.id,
      propertyId: property2.id,
      tokens: 25,
      amount: 25000, // 25 tokens * 1000 SAR each
      status: OrderStatus.PAID,
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
      blockchainTxId: '0xabc123def456789',
    },
  })

  await prisma.certificate.create({
    data: {
      code: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: investor.id,
      propertyId: property2.id,
      orderId: order2.id,
      blockchainTxId: '0xdef789ghi012345',
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
      phoneNumber: '+966 55 234 5678',
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
      status: OrderStatus.PAID,
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
      blockchainTxId: '0xghi456jkl789012',
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
 { title: property2.title, tenant: demoTenant.name },
 { title: propertyNada.title, id: propertyNada.id, url: '/properties/' + propertyNada.id }
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
