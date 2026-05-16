import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async exportAccountData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        children: { orderBy: { createdAt: 'asc' } },
        books: {
          orderBy: { createdAt: 'asc' },
          include: {
            child: { select: { id: true, name: true } },
            template: { select: { id: true, slug: true, title: true } },
            pages: { orderBy: { pageNumber: 'asc' } },
            illustrations: { orderBy: { createdAt: 'asc' } },
            jobs: { orderBy: { queuedAt: 'asc' } },
            ratings: { orderBy: { createdAt: 'asc' } },
          },
        },
        ratings: { orderBy: { createdAt: 'asc' } },
        subscriptions: { orderBy: { createdAt: 'asc' } },
        paymentCustomers: { orderBy: { createdAt: 'asc' } },
        referrals: { orderBy: { createdAt: 'asc' } },
        referredBy: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        freeGenerationsUsed: user.freeGenerationsUsed,
        freeGenerationsPeriodStart:
          user.freeGenerationsPeriodStart.toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      children: user.children,
      books: user.books,
      ratings: user.ratings,
      subscriptions: user.subscriptions,
      paymentCustomers: user.paymentCustomers,
      referrals: user.referrals,
      referredBy: user.referredBy,
    };
  }

  async deleteAccount(userId: string) {
    const books = await this.prisma.book.findMany({
      where: { userId },
      select: {
        pdfObjectKey: true,
        illustrations: {
          select: {
            objectKey: true,
          },
        },
      },
    });

    const objectKeys = books
      .flatMap((book) => [
        book.pdfObjectKey,
        ...book.illustrations.map((illustration) => illustration.objectKey),
      ])
      .filter((key): key is string => Boolean(key));

    await this.storage.deleteFiles(objectKeys);

    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: deletedAt,
        },
      }),
      this.prisma.user.delete({
        where: { id: userId },
      }),
    ]);
  }
}
