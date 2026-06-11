import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedPolicies } from './seed-policies.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.transactionLedger.deleteMany({});
  await prisma.gpsLog.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.rental.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.model.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.vehicleType.deleteMany({});
  await prisma.fuelType.deleteMany({});
  await prisma.geofence.deleteMany({});
  await prisma.feeConfig.deleteMany({});
  await prisma.rentalPolicy.deleteMany({});
  await prisma.seasonalRate.deleteMany({});
  await prisma.companyInfo.deleteMany({});

  console.log('Seeding Admin user...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@fleetvault.com',
      passwordHash,
      role: 'ADMINISTRATOR',
    },
  });
  await prisma.employee.create({
    data: {
      name: 'Admin',
      nationalId: 'EMP-00000',
      commissionPercentage: 0,
      hireDate: new Date('2024-01-01'),
      shift: 'MORNING',
      userId: adminUser.id,
    },
  });

  console.log('Seeding Damage Types...');
  const glassDt = await prisma.damageType.create({ data: { name: 'Vidrios rotos', key: 'GLASS', description: 'Parabrisas o vidrios rotos' } });
  const scratchesDt = await prisma.damageType.create({ data: { name: 'Rayones', key: 'SCRATCH', description: 'Rayones en la carrocería' } });
  const tireDt = await prisma.damageType.create({ data: { name: 'Llantas', key: 'TIRE', description: 'Neumáticos dañados o perdidos (por posición)' } });
  const spareTireDt = await prisma.damageType.create({ data: { name: 'Neumático de repuesto', key: 'SPARE_TIRE', description: 'Neumático de repuesto faltante' } });
  const jackDt = await prisma.damageType.create({ data: { name: 'Gato hidráulico', key: 'JACK', description: 'Gato hidráulico faltante' } });

  console.log('Seeding Fee Config...');
  await prisma.feeConfig.createMany({
    data: [
      { key: 'LATE_FEE_PER_HOUR', label: 'Devolución tardía (por hora)', amount: 1500, description: 'Cargo por hora después de la hora de devolución (1h de gracia)' },
      { key: 'FUEL_FLAT_FEE', label: 'Cargo por servicio de combustible', amount: 2000, description: 'Cargo fijo por reabastecimiento cuando no se devuelve lleno' },
      { key: 'FUEL_PER_STEP', label: 'Combustible por nivel faltante', amount: 1000, description: 'Cargo adicional por cada nivel de combustible debajo del nivel de salida' },
      { key: 'SECURITY_DEPOSIT', label: 'Depósito de seguridad', amount: 15000, description: 'Monto de retención de depósito por alquiler' },
    ],
  });
  // Tarifas de daños vinculadas a DamageType (sin key, se resuelven dinámicamente)
  await prisma.feeConfig.createMany({
    data: [
      { key: null, label: 'Vidrios rotos', amount: 12000, damageTypeId: glassDt.id, description: 'Cargo por parabrisas o vidrios rotos' },
      { key: null, label: 'Rayones', amount: 8000, damageTypeId: scratchesDt.id, description: 'Cargo por rayones nuevos en la devolución' },
      { key: null, label: 'Llantas (c/u)', amount: 5000, damageTypeId: tireDt.id, description: 'Cargo por neumático dañado o perdido (por posición)' },
      { key: null, label: 'Neumático de repuesto', amount: 3000, damageTypeId: spareTireDt.id, description: 'Cargo por neumático de repuesto faltante' },
      { key: null, label: 'Gato hidráulico', amount: 2000, damageTypeId: jackDt.id, description: 'Cargo por gato hidráulico faltante' },
    ],
  });

  console.log('Seeding Company Info...');
  await prisma.companyInfo.create({
    data: {
      companyName: 'FleetVault Rental',
      rnc: '1-01-00000-0',
      address: 'Av. Winston Churchill 123, Blue Mall',
      phone: '(809) 555-0000',
      email: 'info@fleetvault.com',
      website: 'https://www.fleetvault.com',
      city: 'Santo Domingo',
    },
  });

  console.log('Seeding Rental Policies...');
  await seedPolicies();

  console.log('Seeding completed successfully!');
  console.log('');
  console.log('  Admin login: admin@fleetvault.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
