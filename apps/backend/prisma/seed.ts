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
  await prisma.feeConfig.deleteMany({});
  await prisma.inspectionDamage.deleteMany({});
  await prisma.damageType.deleteMany({});
  await prisma.rentalPolicy.deleteMany({});
  await prisma.seasonalRate.deleteMany({});
  await prisma.companyInfo.deleteMany({});
  await prisma.geofence.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  const logins: { email: string; role: string }[] = [];

  console.log('Seeding Admin user...');
  const adminUser = await prisma.user.create({
    data: { email: 'admin@fleetvault.com', passwordHash, role: 'ADMINISTRATOR' },
  });
  await prisma.employee.create({
    data: {
      name: 'Admin Principal',
      nationalId: 'EMP-00001',
      commissionPercentage: 0,
      hireDate: new Date('2024-01-01'),
      shift: 'MORNING',
      userId: adminUser.id,
    },
  });
  logins.push({ email: 'admin@fleetvault.com', role: 'ADMINISTRATOR' });

  console.log('Seeding default users...');

  // --- AGENT ---
    const agentUser = await prisma.user.create({
      data: { email: 'agent@fleetvault.com', passwordHash, role: 'AGENT' },
    });
    await prisma.employee.create({
      data: {
        name: 'Ana Martínez',
        nationalId: '00100000017',
        phone: '(809) 555-1001',
        commissionPercentage: 5,
        hireDate: new Date('2024-06-15'),
        shift: 'MORNING',
        userId: agentUser.id,
      },
    });
    logins.push({ email: 'agent@fleetvault.com', role: 'AGENT' });

    // --- INSPECTOR ---
    const inspectorUser = await prisma.user.create({
      data: { email: 'inspector@fleetvault.com', passwordHash, role: 'INSPECTOR' },
    });
    await prisma.employee.create({
      data: {
        name: 'Carlos Peña',
        nationalId: '00200000024',
        phone: '(809) 555-1002',
        commissionPercentage: 3,
        hireDate: new Date('2024-08-01'),
        shift: 'AFTERNOON',
        userId: inspectorUser.id,
      },
    });
    logins.push({ email: 'inspector@fleetvault.com', role: 'INSPECTOR' });

    // --- CUSTOMER INDIVIDUAL ---
    const individualUser = await prisma.user.create({
      data: { email: 'juan@fleetvault.com', passwordHash, role: 'CUSTOMER' },
    });
    await prisma.customer.create({
      data: {
        name: 'Juan Pérez',
        email: 'juan@fleetvault.com',
        phone: '(809) 555-2001',
        address: 'Calle Las Palmas #42, Ensanche Ozama',
        nationalId: '00300000032',
        creditLimit: 50000,
        type: 'INDIVIDUAL',
        licenseNumber: 'L-12345',
        licenseCountry: 'República Dominicana',
        licenseExpDate: new Date('2028-12-31'),
        userId: individualUser.id,
      },
    });
    logins.push({ email: 'juan@fleetvault.com', role: 'CUSTOMER (Individual)' });

    // --- CUSTOMER CORPORATE ---
    const corporateUser = await prisma.user.create({
      data: { email: 'empresa@fleetvault.com', passwordHash, role: 'CUSTOMER' },
    });
    await prisma.customer.create({
      data: {
        name: 'Comercial del Este SRL',
        email: 'empresa@fleetvault.com',
        phone: '(809) 555-3001',
        address: 'Av. Churchill #250, Piantini',
        nationalId: '101000007',
        creditLimit: 200000,
        type: 'CORPORATE',
        userId: corporateUser.id,
      },
    });
    logins.push({ email: 'empresa@fleetvault.com', role: 'CUSTOMER (Corporate)' });

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

  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  Seed completed successfully!');
  console.log('══════════════════════════════════════════');
  console.log('');
  console.log('  Default accounts (password123 for all):');
  console.log('  ─────────────────────────────────────');
  for (const { email, role } of logins) {
    console.log(`  ${role.padEnd(28)} ${email}`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
