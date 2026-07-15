import { prisma } from "../src/lib/prisma";

async function main() {
  const name = "Default Tenant";
  const existing = await prisma.tenant.findFirst({ where: { name } });

  if (existing) {
    console.log("Tenant exists:", existing.id);
    return;
  }

  const tenant = await prisma.tenant.create({ data: { name } });
  console.log("Created tenant:", tenant.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
