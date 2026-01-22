// src/users/users.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PrismaClient } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private get db() {
    return this.prisma as unknown as PrismaClient;
  }

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash?: string | null;
    displayName: string;
    avatarUrl?: string | null;
    emailVerifiedAt?: Date | null;
    googleSub?: string | null;
  }) {
    return this.db.user.create({ data });
  }

  async updateDisplayName(userId: string, displayName: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { displayName },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        emailVerifiedAt: true,
        role: true,
      },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string | null) {
    return this.db.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  }

  // admin check
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN';
  }

  // EMAIL VERIFICATION

  async upsertEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    return this.db.emailVerificationToken.upsert({
      where: { userId },
      create: { userId, tokenHash, expiresAt },
      update: { tokenHash, expiresAt },
    });
  }

  async findEmailVerificationByHash(tokenHash: string) {
    return this.db.emailVerificationToken.findFirst({
      where: { tokenHash },
      select: {
        userId: true,
        expiresAt: true,
        user: { select: { emailVerifiedAt: true } },
      },
    });
  }

  async deleteEmailVerificationToken(userId: string) {
    return this.db.emailVerificationToken
      .delete({ where: { userId } })
      .catch(() => null);
  }

  async markEmailVerified(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  // GOOGLE LOGIN
  async findByGoogleSub(googleSub: string) {
    return this.prisma.user.findUnique({ where: { googleSub } });
  }

  async findByDisplayName(displayName: string) {
    return this.prisma.user.findUnique({ where: { displayName } });
  }

  async linkGoogleSub(
    userId: string,
    googleSub: string,
    opts?: { avatarUrl?: string | null; emailVerifiedAt?: Date | null },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        googleSub,
        avatarUrl: opts?.avatarUrl ?? undefined,
        emailVerifiedAt: opts?.emailVerifiedAt ?? undefined,
      },
    });
  }

  // update profile info from Google on each login
  async touchGoogleProfile(
    userId: string,
    opts: { avatarUrl?: string | null; emailVerifiedAt?: Date | null },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: opts.avatarUrl ?? undefined,
        emailVerifiedAt: opts.emailVerifiedAt ?? undefined,
      },
    });
  }

  // USER DELETION
  async deleteUser(userId: string) {
    return this.db.$transaction(async (tx) => {
      await tx.emailVerificationToken
        .deleteMany({ where: { userId } })
        .catch(() => null);

      await tx.channelRead.deleteMany({ where: { userId } });
      await tx.messageReaction.deleteMany({ where: { userId } });
      await tx.messageMention.deleteMany({ where: { userId } });

      await tx.message.updateMany({
        where: { deletedById: userId },
        data: { deletedById: null },
      });

      const chans = await tx.channel.findMany({
        where: { members: { some: { id: userId } } },
        select: { id: true },
      });

      for (const c of chans) {
        await tx.channel.update({
          where: { id: c.id },
          data: { members: { disconnect: { id: userId } } },
        });
      }

      // reply safety
      const myMsgIds = await tx.message.findMany({
        where: { authorId: userId },
        select: { id: true },
      });

      if (myMsgIds.length) {
        await tx.message.updateMany({
          where: { parentId: { in: myMsgIds.map((m) => m.id) } },
          data: { parentId: null },
        });
      }

      await tx.message.deleteMany({ where: { authorId: userId } });

      return tx.user.delete({ where: { id: userId } });
    });
  }

  async ensureGeneralMembership(userId: string) {
    return this.db.$transaction(async (tx) => {
      const general =
        (await tx.channel.findFirst({
          where: { isDirect: false, name: 'general' },
          select: { id: true },
        })) ??
        (await tx.channel.create({
          data: { name: 'general', isDirect: false },
          select: { id: true },
        }));

      const channelId = general.id;

      // only connect if not already a member (no silent catch)
      const alreadyMember = await tx.channel.findFirst({
        where: { id: channelId, members: { some: { id: userId } } },
        select: { id: true },
      });

      if (!alreadyMember) {
        await tx.channel.update({
          where: { id: channelId },
          data: { members: { connect: { id: userId } } },
        });
      }

      // set lastRead to latest message (or now) so unread starts at 0
      const latest = await tx.message.findFirst({
        where: { channelId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const at = latest?.createdAt ?? new Date();

      await tx.channelRead.upsert({
        where: { userId_channelId: { userId, channelId } },
        update: { lastRead: at },
        create: { userId, channelId, lastRead: at },
      });

      return { ok: true, channelId };
    });
  }
}
