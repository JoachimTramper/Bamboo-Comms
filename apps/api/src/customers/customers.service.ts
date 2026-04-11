import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private get db() {
    return this.prisma as unknown as PrismaClient;
  }

  findById(id: string) {
    return this.db.customer.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.db.customer.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  create(data: {
    email?: string | null;
    name?: string | null;
    company?: string | null;
    planTier?: string | null;
  }) {
    const normalizedEmail = data.email?.trim().toLowerCase() || null;

    return this.db.customer.create({
      data: {
        email: normalizedEmail,
        name: data.name?.trim() || null,
        company: data.company?.trim() || null,
        planTier: data.planTier?.trim() || null,
      },
    });
  }

  async findOrCreateByEmail(
    email: string,
    defaults?: { name?: string | null; company?: string | null; planTier?: string | null },
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.findByEmail(normalizedEmail);
    if (existing) return existing;

    return this.create({
      email: normalizedEmail,
      name: defaults?.name ?? null,
      company: defaults?.company ?? null,
      planTier: defaults?.planTier ?? null,
    });
  }

  updateProfile(
    customerId: string,
    data: {
      email?: string | null;
      name?: string | null;
      company?: string | null;
      planTier?: string | null;
    },
  ) {
    return this.db.customer.update({
      where: { id: customerId },
      data: {
        email:
          data.email === undefined ? undefined : data.email?.trim().toLowerCase() || null,
        name: data.name === undefined ? undefined : data.name?.trim() || null,
        company:
          data.company === undefined ? undefined : data.company?.trim() || null,
        planTier:
          data.planTier === undefined ? undefined : data.planTier?.trim() || null,
      },
    });
  }
}
