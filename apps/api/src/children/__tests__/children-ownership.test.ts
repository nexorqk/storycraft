import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ChildrenService } from '../children.service';
import { PrismaService } from '../../prisma/prisma.service';

const userA = 'user-a';
const userB = 'user-b';
const childAId = 'child-a';

function makePrismaMock() {
  return {
    child: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

const childARow = {
  id: childAId,
  userId: userA,
  name: 'Masha',
  birthDate: new Date('2020-01-01'),
  interests: ['dinosaurs'],
  readingLevel: 'beginner',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Children ownership boundaries', () => {
  let service: ChildrenService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildrenService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ChildrenService>(ChildrenService);
  });

  describe('listChildren — isolation', () => {
    it('only returns children for the requesting user', async () => {
      prisma.child.findMany.mockResolvedValue([childARow]);

      const result = await service.listChildren(userA);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(childAId);
      expect(prisma.child.findMany).toHaveBeenCalledWith({
        where: { userId: userA },
        orderBy: [{ createdAt: 'desc' }],
      });
    });

    it('does not return children for userB when listing for userA', async () => {
      prisma.child.findMany.mockResolvedValue([]);

      await service.listChildren(userA);

      const calledWith = prisma.child.findMany.mock.calls[0]![0] as {
        where: { userId: string };
      };
      expect(calledWith.where.userId).toBe(userA);
      expect(calledWith.where.userId).not.toBe(userB);
    });
  });

  describe('updateChild — cross-user access', () => {
    it('rejects update of a child owned by another user', async () => {
      prisma.child.findFirst.mockResolvedValue(null);

      await expect(
        service.updateChild(userB, childAId, { name: 'Hacked' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.child.update).not.toHaveBeenCalled();
    });

    it('allows the owner to update their own child', async () => {
      prisma.child.findFirst.mockResolvedValue(childARow);
      prisma.child.update.mockResolvedValue({
        ...childARow,
        name: 'Masha Updated',
      });

      const result = await service.updateChild(userA, childAId, {
        name: 'Masha Updated',
      });

      expect(result.name).toBe('Masha Updated');
      expect(prisma.child.findFirst).toHaveBeenCalledWith({
        where: { id: childAId, userId: userA },
      });
    });
  });

  describe('deleteChild — cross-user access', () => {
    it('rejects deletion of a child owned by another user', async () => {
      prisma.child.findFirst.mockResolvedValue(null);

      await expect(service.deleteChild(userB, childAId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.child.delete).not.toHaveBeenCalled();
    });

    it('allows the owner to delete their own child', async () => {
      prisma.child.findFirst.mockResolvedValue(childARow);
      prisma.child.delete.mockResolvedValue(childARow);

      await service.deleteChild(userA, childAId);

      expect(prisma.child.delete).toHaveBeenCalledWith({
        where: { id: childAId },
      });
    });
  });
});
