import { Injectable, NotFoundException } from '@nestjs/common';
import type { Child } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { CreateChildDto } from './dto/create-child.dto';
import type { UpdateChildDto } from './dto/update-child.dto';

export type PublicChild = {
  id: string;
  name: string;
  birthDate: string | null;
  interests: string[];
  readingLevel: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async listChildren(userId: string) {
    const children = await this.prisma.child.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return children.map((child) => this.toPublicChild(child));
  }

  async createChild(userId: string, dto: CreateChildDto) {
    const child = await this.prisma.child.create({
      data: {
        userId,
        name: dto.name.trim(),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        interests: this.normalizeInterests(dto.interests),
        readingLevel: this.normalizeOptionalText(dto.readingLevel),
      },
    });

    return this.toPublicChild(child);
  }

  async updateChild(userId: string, childId: string, dto: UpdateChildDto) {
    await this.findOwnedChild(userId, childId);

    const child = await this.prisma.child.update({
      where: { id: childId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.birthDate !== undefined
          ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }
          : {}),
        ...(dto.interests !== undefined
          ? { interests: this.normalizeInterests(dto.interests) }
          : {}),
        ...(dto.readingLevel !== undefined
          ? { readingLevel: this.normalizeOptionalText(dto.readingLevel) }
          : {}),
      },
    });

    return this.toPublicChild(child);
  }

  async deleteChild(userId: string, childId: string) {
    await this.findOwnedChild(userId, childId);

    await this.prisma.child.delete({
      where: { id: childId },
    });
  }

  private async findOwnedChild(userId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: {
        id: childId,
        userId,
      },
    });

    if (!child) {
      throw new NotFoundException('Child profile not found');
    }

    return child;
  }

  private normalizeInterests(interests: string[] | undefined) {
    return [...new Set((interests ?? []).map((item) => item.trim()))].filter(
      Boolean,
    );
  }

  private normalizeOptionalText(value: string | undefined) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private toPublicChild(child: Child): PublicChild {
    return {
      id: child.id,
      name: child.name,
      birthDate: child.birthDate?.toISOString() ?? null,
      interests: child.interests,
      readingLevel: child.readingLevel,
      createdAt: child.createdAt.toISOString(),
      updatedAt: child.updatedAt.toISOString(),
    };
  }
}
