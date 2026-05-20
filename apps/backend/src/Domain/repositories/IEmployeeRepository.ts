import { Employee } from '../entities/index.js';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByUserId(userId: string): Promise<Employee | null>;
  findByNationalId(nationalId: string): Promise<Employee | null>;
  create(data: {
    name: string;
    nationalId: string;
    commissionPercentage?: number;
    hireDate: Date;
    shift?: string;
    status?: string;
    userId?: string | null;
  }): Promise<Employee>;
}
