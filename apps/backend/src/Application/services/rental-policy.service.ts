import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError } from '../../Domain/errors/index.js';
import { CreateRentalPolicyInput, UpdateRentalPolicyInput } from '@rent-car/common';

export class RentalPolicyService {
  async listPolicies(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return await prisma.rentalPolicy.findMany({ where, orderBy: { key: 'asc' } });
  }

  async getPolicyByKey(key: string) {
    const item = await prisma.rentalPolicy.findUnique({ where: { key } });
    if (!item) throw new NotFoundError(`Policy '${key}' not found`);
    return item;
  }

  async createPolicy(input: CreateRentalPolicyInput) {
    return await prisma.rentalPolicy.create({
      data: {
        key: input.key,
        title: input.title,
        content: input.content,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updatePolicy(id: string, input: UpdateRentalPolicyInput) {
    const item = await prisma.rentalPolicy.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Policy not found');
    return await prisma.rentalPolicy.update({ where: { id }, data: input });
  }
}
