import { prisma } from '../db.js';
import { IUserRepository } from '../../Domain/repositories/index.js';
import { User } from '../../Domain/entities/index.js';

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? (user as any) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? (user as any) : null;
  }

  async create(data: { email: string; passwordHash: string; role: string }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });
    return user as any;
  }
}
