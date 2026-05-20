import { prisma } from '../db.js';
import { ICustomerRepository } from '../../Domain/repositories/index.js';
import { Customer } from '../../Domain/entities/index.js';

export class PrismaCustomerRepository implements ICustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({ where: { id } });
    return customer ? (customer as any) : null;
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    return customer ? (customer as any) : null;
  }

  async findByNationalId(nationalId: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({ where: { nationalId } });
    return customer ? (customer as any) : null;
  }

  async create(data: {
    name: string;
    nationalId: string;
    creditCardNumber?: string | null;
    creditLimit?: number;
    type?: string;
    status?: string;
    licenseNumber: string;
    licenseCountry: string;
    licenseExpDate: Date;
    licensePhotoUrl?: string | null;
    userId?: string | null;
  }): Promise<Customer> {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        nationalId: data.nationalId,
        creditCardNumber: data.creditCardNumber,
        creditLimit: data.creditLimit,
        type: data.type,
        status: data.status,
        licenseNumber: data.licenseNumber,
        licenseCountry: data.licenseCountry,
        licenseExpDate: data.licenseExpDate,
        licensePhotoUrl: data.licensePhotoUrl,
        userId: data.userId,
      },
    });
    return customer as any;
  }
}
