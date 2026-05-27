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

  console.log('Seeding Fee Config...');
  await prisma.feeConfig.createMany({
    data: [
      { key: 'LATE_FEE_PER_HOUR', label: 'Devolución tardía (por hora)', amount: 1500, description: 'Cargo por hora después de la hora de devolución (1h de gracia)' },
      { key: 'FUEL_FLAT_FEE', label: 'Cargo por servicio de combustible', amount: 2000, description: 'Cargo fijo por reabastecimiento cuando no se devuelve lleno' },
      { key: 'FUEL_PER_STEP', label: 'Combustible por nivel faltante', amount: 1000, description: 'Cargo adicional por cada nivel de combustible debajo del nivel de salida' },
      { key: 'GLASS_DAMAGE', label: 'Daño de vidrios rotos', amount: 12000, description: 'Cargo por parabrisas o vidrios rotos' },
      { key: 'SCRATCHES', label: 'Daño por rayones', amount: 8000, description: 'Cargo por rayones nuevos encontrados en la devolución' },
      { key: 'TIRE_DAMAGE', label: 'Daño por neumático', amount: 5000, description: 'Cargo por neumático dañado o perdido' },
      { key: 'SECURITY_DEPOSIT', label: 'Depósito de seguridad', amount: 15000, description: 'Monto de retención de depósito por alquiler' },
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
