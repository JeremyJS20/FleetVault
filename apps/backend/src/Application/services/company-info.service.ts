import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError } from '../../Domain/errors/index.js';
import { UpdateCompanyInfoInput } from '@rent-car/common';

export class CompanyInfoService {
  async getCompanyInfo() {
    const info = await prisma.companyInfo.findFirst();
    return info;
  }

  async upsertCompanyInfo(input: UpdateCompanyInfoInput) {
    const existing = await prisma.companyInfo.findFirst();
    if (existing) {
      return await prisma.companyInfo.update({
        where: { id: existing.id },
        data: input,
      });
    }
    return await prisma.companyInfo.create({ data: input });
  }
}
