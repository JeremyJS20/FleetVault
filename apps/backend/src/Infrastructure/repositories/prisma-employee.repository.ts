import { prisma } from '../db.js';
import { IEmployeeRepository } from '../../Domain/repositories/index.js';
import { Employee } from '../../Domain/entities/index.js';

export class PrismaEmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const employee = await prisma.employee.findUnique({ where: { id } });
    return employee ? (employee as any) : null;
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    return employee ? (employee as any) : null;
  }

  async findByNationalId(nationalId: string): Promise<Employee | null> {
    const employee = await prisma.employee.findUnique({ where: { nationalId } });
    return employee ? (employee as any) : null;
  }

  async create(data: {
    name: string;
    nationalId: string;
    commissionPercentage?: number;
    hireDate: Date;
    shift?: string;
    status?: string;
    userId?: string | null;
  }): Promise<Employee> {
    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        nationalId: data.nationalId,
        commissionPercentage: data.commissionPercentage,
        hireDate: data.hireDate,
        shift: data.shift,
        status: data.status,
        userId: data.userId,
      },
    });
    return employee as any;
  }
}
