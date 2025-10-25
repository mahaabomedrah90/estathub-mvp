import pkg from '@prisma/client'
const { PrismaClient, Role, PropertyStatus, OrderStatus } = pkg

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@estathub.local' },
    update: {},
    create: { email: 'admin@estathub.local', name: 'Admin', role: Role.ADMIN },
  })

  // Investor user
  const investor = await prisma.user.upsert({
    where: { email: 'investor@estathub.local' },
    update: {},
    create: { email: 'investor@estathub.local', name: 'Demo Investor', role: Role.INVESTOR },
  })

  // Demo properties
  const p1 = await prisma.property.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Riyadh Rental – Tower Floor 5',
      totalValue: 5000000.0,
      tokenPrice: 1000.0,
      totalTokens: 5000,
      remainingTokens: 4800,
      monthlyYield: 0.9,
      status: PropertyStatus.PUBLISHED,
    },
  })

  const p2 = await prisma.property.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'Jeddah Retail – Shop #12',
      totalValue: 3000000.0,
      tokenPrice: 1000.0,
      totalTokens: 3000,
      remainingTokens: 2900,
      monthlyYield: 1.1,
      status: PropertyStatus.PUBLISHED,
    },
  })

  console.log('Seeded users:', { admin: admin.email, investor: investor.email })
  console.log('Seeded properties:', [p1.title, p2.title])
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
