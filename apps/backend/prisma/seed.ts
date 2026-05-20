import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  // Delete in reverse order of dependencies
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
  await prisma.seasonalRate.deleteMany({});

  console.log('Seeding reference tables...');

  // Fuel Types
  const gasoline = await prisma.fuelType.create({ data: { name: 'Gasoline' } });
  const diesel = await prisma.fuelType.create({ data: { name: 'Diesel' } });
  const electric = await prisma.fuelType.create({ data: { name: 'Electric' } });
  const hybrid = await prisma.fuelType.create({ data: { name: 'Hybrid' } });

  // Vehicle Types
  const sedan = await prisma.vehicleType.create({
    data: { name: 'Sedan', description: 'Standard 4-door passenger car' },
  });
  const suv = await prisma.vehicleType.create({
    data: { name: 'SUV', description: 'Sport Utility Vehicle' },
  });
  const truck = await prisma.vehicleType.create({
    data: { name: 'Truck', description: 'Utility pickup truck' },
  });

  // Brands & Models
  const toyota = await prisma.brand.create({ data: { name: 'Toyota' } });
  const corolla = await prisma.model.create({ data: { name: 'Corolla', brandId: toyota.id } });
  const rav4 = await prisma.model.create({ data: { name: 'RAV4', brandId: toyota.id } });

  const ford = await prisma.brand.create({ data: { name: 'Ford' } });
  const f150 = await prisma.model.create({ data: { name: 'F-150', brandId: ford.id } });
  const explorer = await prisma.model.create({ data: { name: 'Explorer', brandId: ford.id } });

  const tesla = await prisma.brand.create({ data: { name: 'Tesla' } });
  const model3 = await prisma.model.create({ data: { name: 'Model 3', brandId: tesla.id } });

  // Users & Passwords
  const commonPasswordHash = await bcrypt.hash('password123', 10);

  console.log('Seeding Users & Roles...');

  // Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@fleetvault.com',
      passwordHash: commonPasswordHash,
      role: 'ADMINISTRATOR',
    },
  });

  // Agent User + Employee record
  const agentUser = await prisma.user.create({
    data: {
      email: 'agent@fleetvault.com',
      passwordHash: commonPasswordHash,
      role: 'AGENT',
    },
  });
  const agentEmployee = await prisma.employee.create({
    data: {
      name: 'Agent Smith',
      nationalId: 'EMP-00001',
      commissionPercentage: 5.0,
      hireDate: new Date('2024-01-15'),
      shift: 'MORNING',
      userId: agentUser.id,
    },
  });

  // Inspector User + Employee record
  const inspectorUser = await prisma.user.create({
    data: {
      email: 'inspector@fleetvault.com',
      passwordHash: commonPasswordHash,
      role: 'INSPECTOR',
    },
  });
  const inspectorEmployee = await prisma.employee.create({
    data: {
      name: 'Inspector Gadget',
      nationalId: 'EMP-00002',
      commissionPercentage: 2.5,
      hireDate: new Date('2024-02-01'),
      shift: 'AFTERNOON',
      userId: inspectorUser.id,
    },
  });

  // Customer User + Customer record
  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@fleetvault.com',
      passwordHash: commonPasswordHash,
      role: 'CUSTOMER',
    },
  });
  const customerRecord = await prisma.customer.create({
    data: {
      name: 'John Doe',
      nationalId: 'CUST-00001',
      creditCardNumber: '4111111111111111',
      creditLimit: 5000,
      type: 'INDIVIDUAL',
      licenseNumber: 'LIC-998877',
      licenseCountry: 'US',
      licenseExpDate: new Date('2029-12-31'),
      userId: customerUser.id,
    },
  });

  console.log('Seeding Vehicles...');
  // Vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      description: 'Silver Toyota Corolla 2023',
      chassisNumber: '1HX-COROLLA-2023-XYZ',
      engineNumber: 'ENG-COROLLA-778899',
      plateNumber: 'ABC-1234',
      vehicleTypeId: sedan.id,
      brandId: toyota.id,
      modelId: corolla.id,
      fuelTypeId: gasoline.id,
      status: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      odometer: 15200.5,
      lastMaintenanceOdometer: 10000.0,
      imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=500',
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      description: 'Black Ford Explorer 2022',
      chassisNumber: '1HX-EXPLORER-2022-XYZ',
      engineNumber: 'ENG-EXPLORER-112233',
      plateNumber: 'XYZ-5678',
      vehicleTypeId: suv.id,
      brandId: ford.id,
      modelId: explorer.id,
      fuelTypeId: gasoline.id,
      status: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      odometer: 32050.2,
      lastMaintenanceOdometer: 30000.0,
      imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=500',
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      description: 'White Tesla Model 3 2023',
      chassisNumber: '1HX-TESLA3-2023-XYZ',
      engineNumber: 'ENG-TESLA3-445566',
      plateNumber: 'ELEC-999',
      vehicleTypeId: sedan.id,
      brandId: tesla.id,
      modelId: model3.id,
      fuelTypeId: electric.id,
      status: 'RENTED',
      cleaningStatus: 'CLEAN',
      odometer: 8400.0,
      lastMaintenanceOdometer: 0.0,
      imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500',
    },
  });

  console.log('Seeding Seasonal Rates...');
  await prisma.seasonalRate.create({
    data: {
      name: 'Summer Rush',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      multiplier: 1.25,
      status: 'ACTIVE',
    },
  });

  await prisma.seasonalRate.create({
    data: {
      name: 'Christmas Holidays',
      startDate: new Date('2026-12-15'),
      endDate: new Date('2027-01-05'),
      multiplier: 1.35,
      status: 'ACTIVE',
    },
  });

  console.log('Seeding Geofences...');
  await prisma.geofence.create({
    data: {
      name: 'Metro Area Limit',
      coordinatesJson: JSON.stringify([
        [18.4861, -69.9312],
        [18.5204, -69.9312],
        [18.5204, -69.8601],
        [18.4861, -69.8601],
      ]),
      alertEmail: 'alerts@fleetvault.com',
      isActive: true,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
