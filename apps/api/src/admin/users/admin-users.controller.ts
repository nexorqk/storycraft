import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { PublicUser } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        roles: {
          include: { role: true },
        },
        _count: {
          select: { books: true },
        },
      },
    });

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl,
        locale: u.locale,
        roles: u.roles.map((ur) => ur.role.name),
        bookCount: u._count.books,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
    };
  }

  @Get(':userId')
  async getUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
        _count: {
          select: {
            books: true,
            children: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const adminUserIds = await this.getAdminUserIds();

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        freeGenerationsUsed: user.freeGenerationsUsed,
        freeGenerationsPeriodStart: user.freeGenerationsPeriodStart.toISOString(),
        roles: user.roles.map((ur) => ur.role.name),
        bookCount: user._count.books,
        childCount: user._count.children,
        isAdmin: adminUserIds.includes(user.id),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  @Patch(':userId/role')
  async toggleRole(
    @CurrentUser() currentUser: PublicUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: { role: string; action: 'add' | 'remove' },
  ) {
    // Prevent self-demotion
    if (userId === currentUser.id && body.action === 'remove') {
      throw new ForbiddenException('Cannot remove your own ADMIN role');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: body.role as 'ADMIN' | 'USER' },
    });

    if (!role) {
      throw new NotFoundException(`Role "${body.role}" not found`);
    }

    if (body.action === 'add') {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId,
          roleId: role.id,
        },
      });
    } else {
      const existing = await this.prisma.userRole.findFirst({
        where: { userId, roleId: role.id },
      });

      if (existing) {
        await this.prisma.userRole.delete({
          where: { id: existing.id },
        });
      }
    }

    return { ok: true };
  }

  private async getAdminUserIds(): Promise<string[]> {
    const adminRole = await this.prisma.role.findUnique({
      where: { name: 'ADMIN' },
    });

    if (!adminRole) {
      return [];
    }

    const adminUserRoles = await this.prisma.userRole.findMany({
      where: { roleId: adminRole.id },
      select: { userId: true },
    });

    return adminUserRoles.map((ur) => ur.userId);
  }
}
