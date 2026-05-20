import { Customer } from '../entities/index.js';

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByUserId(userId: string): Promise<Customer | null>;
  findByNationalId(nationalId: string): Promise<Customer | null>;
  create(data: {
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
  }): Promise<Customer>;
}
