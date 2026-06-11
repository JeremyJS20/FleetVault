import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  console.log('Brands:', JSON.stringify(brands.map(b => ({ id: b.id, name: b.name, status: b.status })), null, 2));
  for (const brand of brands) {
    const models = await prisma.model.findMany({ where: { brandId: brand.id }, orderBy: { name: 'asc' } });
    console.log('Models for ' + brand.name + ':', JSON.stringify(models.map(m => ({ id: m.id, name: m.name, status: m.status })), null, 2));
  }
  await prisma.$disconnect();
}
main();
