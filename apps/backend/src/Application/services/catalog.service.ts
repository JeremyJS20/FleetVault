import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError, ConflictError } from '../../Domain/errors/index.js';
import {
  CreateVehicleTypeInput, UpdateVehicleTypeInput,
  CreateBrandInput, UpdateBrandInput,
  CreateModelInput, UpdateModelInput,
  CreateFuelTypeInput, UpdateFuelTypeInput,
  CreateVehicleInput, UpdateVehicleInput,
  CreateCustomerInput, UpdateCustomerInput,
  CreateEmployeeInput, UpdateEmployeeInput,
  CreateSeasonalRateInput, UpdateSeasonalRateInput
} from '@rent-car/common';

export class CatalogService {
  // ==========================================
  // VEHICLE TYPES
  // ==========================================
  async listVehicleTypes(filters: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.vehicleType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.vehicleType.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getVehicleTypeById(id: string) {
    const item = await prisma.vehicleType.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Vehicle Type not found');
    return item;
  }

  async createVehicleType(input: CreateVehicleTypeInput) {
    const existing = await prisma.vehicleType.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('Vehicle type name already exists');

    return await prisma.vehicleType.create({
      data: {
        name: input.name,
        description: input.description || null,
        status: 'ACTIVE'
      }
    });
  }

  async updateVehicleType(id: string, input: UpdateVehicleTypeInput) {
    await this.getVehicleTypeById(id);

    if (input.name) {
      const existing = await prisma.vehicleType.findFirst({
        where: { name: input.name, id: { not: id } }
      });
      if (existing) throw new ConflictError('Vehicle type name already exists');
    }

    return await prisma.vehicleType.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description !== undefined ? input.description : undefined
      }
    });
  }

  async toggleVehicleTypeStatus(id: string) {
    const item = await this.getVehicleTypeById(id);
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return await prisma.vehicleType.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  // ==========================================
  // BRANDS
  // ==========================================
  async listBrands(filters: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.name = { contains: filters.search };
    }

    const [items, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.brand.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getBrandById(id: string) {
    const item = await prisma.brand.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Brand not found');
    return item;
  }

  async createBrand(input: CreateBrandInput) {
    const existing = await prisma.brand.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('Brand name already exists');

    return await prisma.brand.create({
      data: {
        name: input.name,
        status: 'ACTIVE'
      }
    });
  }

  async updateBrand(id: string, input: UpdateBrandInput) {
    await this.getBrandById(id);

    if (input.name) {
      const existing = await prisma.brand.findFirst({
        where: { name: input.name, id: { not: id } }
      });
      if (existing) throw new ConflictError('Brand name already exists');
    }

    return await prisma.brand.update({
      where: { id },
      data: { name: input.name }
    });
  }

  async toggleBrandStatus(id: string) {
    const item = await this.getBrandById(id);
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return await prisma.brand.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  // ==========================================
  // MODELS
  // ==========================================
  async listModels(filters: { search?: string; status?: string; brandId?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.brandId) {
      where.brandId = filters.brandId;
    }
    if (filters.search) {
      where.name = { contains: filters.search };
    }

    const [items, total] = await Promise.all([
      prisma.model.findMany({
        where,
        skip,
        take: limit,
        include: { brand: true },
        orderBy: { name: 'asc' }
      }),
      prisma.model.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getModelById(id: string) {
    const item = await prisma.model.findUnique({
      where: { id },
      include: { brand: true }
    });
    if (!item) throw new NotFoundError('Model not found');
    return item;
  }

  async createModel(input: CreateModelInput) {
    const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
    if (!brand) throw new ValidationError('Brand does not exist');
    if (brand.status !== 'ACTIVE') throw new ValidationError('Brand is not active');

    const existing = await prisma.model.findUnique({
      where: { name_brandId: { name: input.name, brandId: input.brandId } }
    });
    if (existing) throw new ConflictError('Model name already exists for this brand');

    return await prisma.model.create({
      data: {
        name: input.name,
        brandId: input.brandId,
        status: 'ACTIVE'
      },
      include: { brand: true }
    });
  }

  async updateModel(id: string, input: UpdateModelInput) {
    const current = await this.getModelById(id);

    const brandId = input.brandId || current.brandId;
    const name = input.name || current.name;

    if (input.brandId && input.brandId !== current.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
      if (!brand) throw new ValidationError('Brand does not exist');
      if (brand.status !== 'ACTIVE') throw new ValidationError('Brand is not active');
    }

    if (input.name || input.brandId) {
      const existing = await prisma.model.findFirst({
        where: { name, brandId, id: { not: id } }
      });
      if (existing) throw new ConflictError('Model name already exists for this brand');
    }

    return await prisma.model.update({
      where: { id },
      data: {
        name: input.name,
        brandId: input.brandId
      },
      include: { brand: true }
    });
  }

  async toggleModelStatus(id: string) {
    const item = await this.getModelById(id);
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return await prisma.model.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  // ==========================================
  // FUEL TYPES
  // ==========================================
  async listFuelTypes(filters: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.name = { contains: filters.search };
    }

    const [items, total] = await Promise.all([
      prisma.fuelType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.fuelType.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getFuelTypeById(id: string) {
    const item = await prisma.fuelType.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Fuel Type not found');
    return item;
  }

  async createFuelType(input: CreateFuelTypeInput) {
    const existing = await prisma.fuelType.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('Fuel type already exists');

    return await prisma.fuelType.create({
      data: {
        name: input.name,
        status: 'ACTIVE'
      }
    });
  }

  async updateFuelType(id: string, input: UpdateFuelTypeInput) {
    await this.getFuelTypeById(id);

    if (input.name) {
      const existing = await prisma.fuelType.findFirst({
        where: { name: input.name, id: { not: id } }
      });
      if (existing) throw new ConflictError('Fuel type already exists');
    }

    return await prisma.fuelType.update({
      where: { id },
      data: { name: input.name }
    });
  }

  async toggleFuelTypeStatus(id: string) {
    const item = await this.getFuelTypeById(id);
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return await prisma.fuelType.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  // ==========================================
  // VEHICLES
  // ==========================================
  async listVehicles(filters: {
    search?: string;
    status?: string;
    cleaningStatus?: string;
    vehicleTypeId?: string;
    brandId?: string;
    modelId?: string;
    fuelTypeId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.cleaningStatus) where.cleaningStatus = filters.cleaningStatus;
    if (filters.vehicleTypeId) where.vehicleTypeId = filters.vehicleTypeId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.modelId) where.modelId = filters.modelId;
    if (filters.fuelTypeId) where.fuelTypeId = filters.fuelTypeId;

    if (filters.search) {
      where.OR = [
        { chassisNumber: { contains: filters.search } },
        { engineNumber: { contains: filters.search } },
        { plateNumber: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicleType: true,
          brand: true,
          model: true,
          fuelType: true
        },
        orderBy: { plateNumber: 'asc' }
      }),
      prisma.vehicle.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getVehicleById(id: string) {
    const item = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicleType: true,
        brand: true,
        model: true,
        fuelType: true
      }
    });
    if (!item) throw new NotFoundError('Vehicle not found');
    return item;
  }

  async createVehicle(input: CreateVehicleInput) {
    // 1. Unique checks
    const chassis = await prisma.vehicle.findUnique({ where: { chassisNumber: input.chassisNumber } });
    if (chassis) throw new ConflictError('Chassis number already exists');

    const engine = await prisma.vehicle.findUnique({ where: { engineNumber: input.engineNumber } });
    if (engine) throw new ConflictError('Engine number already exists');

    const plate = await prisma.vehicle.findUnique({ where: { plateNumber: input.plateNumber } });
    if (plate) throw new ConflictError('Plate number already exists');

    // 2. FK checks
    const vehicleType = await prisma.vehicleType.findUnique({ where: { id: input.vehicleTypeId } });
    if (!vehicleType || vehicleType.status !== 'ACTIVE') throw new ValidationError('Active Vehicle Type required');

    const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
    if (!brand || brand.status !== 'ACTIVE') throw new ValidationError('Active Brand required');

    const model = await prisma.model.findUnique({ where: { id: input.modelId } });
    if (!model || model.status !== 'ACTIVE' || model.brandId !== input.brandId) {
      throw new ValidationError('Active Model matching the selected Brand is required');
    }

    const fuelType = await prisma.fuelType.findUnique({ where: { id: input.fuelTypeId } });
    if (!fuelType || fuelType.status !== 'ACTIVE') throw new ValidationError('Active Fuel Type required');

    return await prisma.vehicle.create({
      data: {
        description: input.description || null,
        chassisNumber: input.chassisNumber,
        engineNumber: input.engineNumber,
        plateNumber: input.plateNumber,
        vehicleTypeId: input.vehicleTypeId,
        brandId: input.brandId,
        modelId: input.modelId,
        fuelTypeId: input.fuelTypeId,
        status: 'AVAILABLE',
        cleaningStatus: 'CLEAN',
        imageUrl: input.imageUrl || null,
        odometer: input.odometer,
        lastMaintenanceOdometer: input.lastMaintenanceOdometer !== undefined ? input.lastMaintenanceOdometer : input.odometer
      },
      include: {
        vehicleType: true,
        brand: true,
        model: true,
        fuelType: true
      }
    });
  }

  async updateVehicle(id: string, input: UpdateVehicleInput) {
    const current = await this.getVehicleById(id);

    // 1. Uniques checks
    if (input.chassisNumber && input.chassisNumber !== current.chassisNumber) {
      const chassis = await prisma.vehicle.findUnique({ where: { chassisNumber: input.chassisNumber } });
      if (chassis) throw new ConflictError('Chassis number already exists');
    }
    if (input.engineNumber && input.engineNumber !== current.engineNumber) {
      const engine = await prisma.vehicle.findUnique({ where: { engineNumber: input.engineNumber } });
      if (engine) throw new ConflictError('Engine number already exists');
    }
    if (input.plateNumber && input.plateNumber !== current.plateNumber) {
      const plate = await prisma.vehicle.findUnique({ where: { plateNumber: input.plateNumber } });
      if (plate) throw new ConflictError('Plate number already exists');
    }

    // 2. FK Checks
    const typeId = input.vehicleTypeId || current.vehicleTypeId;
    const brandId = input.brandId || current.brandId;
    const modelId = input.modelId || current.modelId;
    const fuelTypeId = input.fuelTypeId || current.fuelTypeId;

    if (input.vehicleTypeId && input.vehicleTypeId !== current.vehicleTypeId) {
      const vehicleType = await prisma.vehicleType.findUnique({ where: { id: typeId } });
      if (!vehicleType || vehicleType.status !== 'ACTIVE') throw new ValidationError('Active Vehicle Type required');
    }
    if (input.brandId && input.brandId !== current.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand || brand.status !== 'ACTIVE') throw new ValidationError('Active Brand required');
    }
    if (input.modelId || input.brandId) {
      const model = await prisma.model.findUnique({ where: { id: modelId } });
      if (!model || model.status !== 'ACTIVE' || model.brandId !== brandId) {
        throw new ValidationError('Active Model matching the selected Brand is required');
      }
    }
    if (input.fuelTypeId && input.fuelTypeId !== current.fuelTypeId) {
      const fuelType = await prisma.fuelType.findUnique({ where: { id: fuelTypeId } });
      if (!fuelType || fuelType.status !== 'ACTIVE') throw new ValidationError('Active Fuel Type required');
    }

    return await prisma.vehicle.update({
      where: { id },
      data: {
        description: input.description !== undefined ? input.description : undefined,
        chassisNumber: input.chassisNumber,
        engineNumber: input.engineNumber,
        plateNumber: input.plateNumber,
        vehicleTypeId: typeId,
        brandId: brandId,
        modelId: modelId,
        fuelTypeId: fuelTypeId,
        status: input.status,
        cleaningStatus: input.cleaningStatus,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl || null : undefined,
        odometer: input.odometer,
        lastMaintenanceOdometer: input.lastMaintenanceOdometer
      },
      include: {
        vehicleType: true,
        brand: true,
        model: true,
        fuelType: true
      }
    });
  }

  async toggleVehicleStatus(id: string) {
    const item = await this.getVehicleById(id);
    const newStatus = item.status === 'AVAILABLE' ? 'RETIRED' : 'AVAILABLE';
    return await prisma.vehicle.update({
      where: { id },
      data: { status: newStatus },
      include: {
        vehicleType: true,
        brand: true,
        model: true,
        fuelType: true
      }
    });
  }

  async updateVehicleCleaning(id: string, cleaningStatus: 'CLEAN' | 'DIRTY') {
    const vehicle = await this.getVehicleById(id);
    let newStatus = vehicle.status;

    if (cleaningStatus === 'CLEAN' && vehicle.status === 'UNDER_INSPECTION') {
      // In the inspections flow, when completed & set to CLEAN, revert back to AVAILABLE unless MAINTENANCE flagged
      newStatus = 'AVAILABLE';
    }

    return await prisma.vehicle.update({
      where: { id },
      data: {
        cleaningStatus,
        status: newStatus
      },
      include: {
        vehicleType: true,
        brand: true,
        model: true,
        fuelType: true
      }
    });
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================
  async listCustomers(filters: { search?: string; status?: string; type?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { nationalId: { contains: filters.search } },
        { licenseNumber: { contains: filters.search } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.customer.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getCustomerById(id: string) {
    const item = await prisma.customer.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Customer not found');
    return item;
  }

  async createCustomer(input: CreateCustomerInput) {
    const existing = await prisma.customer.findUnique({ where: { nationalId: input.nationalId } });
    if (existing) throw new ConflictError('National ID already exists');

    if (input.userId) {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new ValidationError('User profile does not exist');
      const uniqueUser = await prisma.customer.findUnique({ where: { userId: input.userId } });
      if (uniqueUser) throw new ConflictError('User is already linked to another customer');
    }

    return await prisma.customer.create({
      data: {
        name: input.name,
        nationalId: input.nationalId,
        creditCardNumber: input.creditCardNumber || null,
        creditLimit: input.creditLimit,
        type: input.type,
        status: 'ACTIVE',
        licenseNumber: input.licenseNumber,
        licenseCountry: input.licenseCountry,
        licenseExpDate: new Date(input.licenseExpDate),
        licensePhotoUrl: input.licensePhotoUrl || null,
        userId: input.userId || null
      }
    });
  }

  async updateCustomer(id: string, input: UpdateCustomerInput) {
    const current = await this.getCustomerById(id);

    if (input.nationalId && input.nationalId !== current.nationalId) {
      const existing = await prisma.customer.findUnique({ where: { nationalId: input.nationalId } });
      if (existing) throw new ConflictError('National ID already exists');
    }

    if (input.userId && input.userId !== current.userId) {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new ValidationError('User profile does not exist');
      const uniqueUser = await prisma.customer.findUnique({ where: { userId: input.userId } });
      if (uniqueUser) throw new ConflictError('User is already linked to another customer');
    }

    return await prisma.customer.update({
      where: { id },
      data: {
        name: input.name,
        nationalId: input.nationalId,
        creditCardNumber: input.creditCardNumber !== undefined ? input.creditCardNumber : undefined,
        creditLimit: input.creditLimit,
        type: input.type,
        status: input.status,
        licenseNumber: input.licenseNumber,
        licenseCountry: input.licenseCountry,
        licenseExpDate: input.licenseExpDate ? new Date(input.licenseExpDate) : undefined,
        licensePhotoUrl: input.licensePhotoUrl !== undefined ? input.licensePhotoUrl : undefined,
        userId: input.userId !== undefined ? input.userId : undefined
      }
    });
  }

  async toggleCustomerStatus(id: string) {
    const item = await this.getCustomerById(id);
    const newStatus = item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    return await prisma.customer.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  // ==========================================
  // EMPLOYEES
  // ==========================================
  async listEmployees(filters: { search?: string; status?: string; shift?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.shift) where.shift = filters.shift;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { nationalId: { contains: filters.search } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.employee.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getEmployeeById(id: string) {
    const item = await prisma.employee.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Employee not found');
    return item;
  }

  async createEmployee(input: CreateEmployeeInput) {
    const existing = await prisma.employee.findUnique({ where: { nationalId: input.nationalId } });
    if (existing) throw new ConflictError('National ID already registered for an employee');

    if (input.userId) {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new ValidationError('User profile does not exist');
      const uniqueUser = await prisma.employee.findUnique({ where: { userId: input.userId } });
      if (uniqueUser) throw new ConflictError('User is already linked to another employee');
    }

    return await prisma.employee.create({
      data: {
        name: input.name,
        nationalId: input.nationalId,
        commissionPercentage: input.commissionPercentage,
        hireDate: new Date(input.hireDate),
        shift: input.shift,
        status: 'ACTIVE',
        userId: input.userId || null
      }
    });
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput) {
    const current = await this.getEmployeeById(id);

    if (input.nationalId && input.nationalId !== current.nationalId) {
      const existing = await prisma.employee.findUnique({ where: { nationalId: input.nationalId } });
      if (existing) throw new ConflictError('National ID already registered for an employee');
    }

    if (input.userId && input.userId !== current.userId) {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new ValidationError('User profile does not exist');
      const uniqueUser = await prisma.employee.findUnique({ where: { userId: input.userId } });
      if (uniqueUser) throw new ConflictError('User is already linked to another employee');
    }

    return await prisma.employee.update({
      where: { id },
      data: {
        name: input.name,
        nationalId: input.nationalId,
        commissionPercentage: input.commissionPercentage,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
        shift: input.shift,
        status: input.status,
        userId: input.userId !== undefined ? input.userId : undefined
      }
    });
  }

  async toggleEmployeeStatus(id: string) {
    const item = await this.getEmployeeById(id);
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return await prisma.employee.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  // ==========================================
  // SEASONAL RATES
  // ==========================================
  async listSeasonalRates(filters: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.name = { contains: filters.search };
    }

    const [items, total] = await Promise.all([
      prisma.seasonalRate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.seasonalRate.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getSeasonalRateById(id: string) {
    const item = await prisma.seasonalRate.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Seasonal rate not found');
    return item;
  }

  async createSeasonalRate(input: CreateSeasonalRateInput) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (start > end) {
      throw new ValidationError('Start date must be before or equal to end date');
    }

    return await prisma.seasonalRate.create({
      data: {
        name: input.name,
        startDate: start,
        endDate: end,
        multiplier: input.multiplier,
        status: 'ACTIVE'
      }
    });
  }

  async updateSeasonalRate(id: string, input: UpdateSeasonalRateInput) {
    const current = await this.getSeasonalRateById(id);

    const start = input.startDate ? new Date(input.startDate) : current.startDate;
    const end = input.endDate ? new Date(input.endDate) : current.endDate;

    if (start > end) {
      throw new ValidationError('Start date must be before or equal to end date');
    }

    return await prisma.seasonalRate.update({
      where: { id },
      data: {
        name: input.name,
        startDate: input.startDate ? start : undefined,
        endDate: input.endDate ? end : undefined,
        multiplier: input.multiplier,
        status: input.status
      }
    });
  }

  async toggleSeasonalRateStatus(id: string) {
    const item = await this.getSeasonalRateById(id);
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return await prisma.seasonalRate.update({
      where: { id },
      data: { status: newStatus }
    });
  }
}
