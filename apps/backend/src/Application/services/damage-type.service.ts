import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError } from '../../Domain/errors/index.js';
import type { CreateDamageTypeInput, UpdateDamageTypeInput, CreateDamageFeeInput } from '@rent-car/common';

export class DamageTypeService {
  async listDamageTypes() {
    return await prisma.damageType.findMany({
      orderBy: { name: 'asc' },
      include: { feeConfig: true }
    });
  }

  async getActiveDamageTypes() {
    return await prisma.damageType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async getDamageTypeById(id: string) {
    const item = await prisma.damageType.findUnique({
      where: { id },
      include: { feeConfig: true }
    });
    if (!item) throw new NotFoundError('Damage type not found');
    return item;
  }

  async createDamageType(input: CreateDamageTypeInput) {
    const existing = await prisma.damageType.findUnique({ where: { key: input.key } });
    if (existing) throw new ValidationError(`Damage type with key '${input.key}' already exists`);

    return await prisma.damageType.create({
      data: {
        name: input.name,
        key: input.key,
        description: input.description ?? null,
      },
      include: { feeConfig: true }
    });
  }

  async updateDamageType(id: string, input: UpdateDamageTypeInput) {
    await this.getDamageTypeById(id);
    return await prisma.damageType.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.key !== undefined ? { key: input.key } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include: { feeConfig: true }
    });
  }

  async toggleDamageTypeStatus(id: string) {
    const item = await this.getDamageTypeById(id);
    return await prisma.damageType.update({
      where: { id },
      data: { isActive: !item.isActive },
      include: { feeConfig: true }
    });
  }

  async getDamageFee(damageTypeId: string) {
    const dt = await this.getDamageTypeById(damageTypeId);
    if (!dt.feeConfig) throw new NotFoundError('No fee configured for this damage type');
    return dt.feeConfig;
  }

  async upsertDamageFee(input: CreateDamageFeeInput) {
    await this.getDamageTypeById(input.damageTypeId);
    const existing = await prisma.feeConfig.findUnique({ where: { damageTypeId: input.damageTypeId } });
    if (existing) {
      return await prisma.feeConfig.update({
        where: { id: existing.id },
        data: { amount: input.amount },
      });
    }
    const dt = await prisma.damageType.findUnique({ where: { id: input.damageTypeId } });
    return await prisma.feeConfig.create({
      data: {
        key: null,
        label: dt!.name,
        amount: input.amount,
        damageTypeId: input.damageTypeId,
        description: dt!.description,
      },
    });
  }
}
