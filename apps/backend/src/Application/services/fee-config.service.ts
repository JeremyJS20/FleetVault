import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError } from '../../Domain/errors/index.js';
import { UpdateFeeConfigInput } from '@rent-car/common';

export class FeeConfigService {
  async listFeeConfigs() {
    return await prisma.feeConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getFeeConfigByKey(key: string) {
    const item = await prisma.feeConfig.findUnique({ where: { key } });
    if (!item) throw new NotFoundError(`Fee config '${key}' not found`);
    return item;
  }

  async updateFeeConfig(id: string, input: UpdateFeeConfigInput) {
    const item = await prisma.feeConfig.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Fee config not found');

    return await prisma.feeConfig.update({
      where: { id },
      data: { amount: input.amount },
    });
  }

  async loadFeeConfigMap(): Promise<Record<string, number>> {
    const fees = await prisma.feeConfig.findMany();
    const map: Record<string, number> = {};
    for (const fee of fees) {
      map[fee.key] = fee.amount;
    }
    return map;
  }
}
