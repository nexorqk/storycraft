import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ChildrenService } from '../children.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  child: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ChildrenService', () => {
  let service: ChildrenService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildrenService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ChildrenService>(ChildrenService);
  });

  describe('listChildren', () => {
    it('returns children for a user', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          name: 'Masha',
          birthDate: new Date('2020-01-01'),
          interests: ['dinosaurs'],
          readingLevel: 'beginner',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.child.findMany.mockResolvedValue(mockChildren);

      const result = await service.listChildren('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Masha');
      expect(result[0]!.birthDate).toBe('2020-01-01T00:00:00.000Z');
    });

    it('returns empty array when no children exist', async () => {
      mockPrismaService.child.findMany.mockResolvedValue([]);

      const result = await service.listChildren('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createChild', () => {
    it('creates a child with trimmed name', async () => {
      mockPrismaService.child.create.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
        birthDate: new Date('2020-01-01'),
        interests: ['dinosaurs'],
        readingLevel: 'beginner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createChild('user-1', {
        name: '  Masha  ',
        birthDate: '2020-01-01',
        interests: ['dinosaurs'],
        readingLevel: 'beginner',
      });

      expect(mockPrismaService.child.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Masha',
        }),
      });
      expect(result.name).toBe('Masha');
    });

    it('deduplicates interests', async () => {
      mockPrismaService.child.create.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
        birthDate: null,
        interests: ['dinosaurs'],
        readingLevel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createChild('user-1', {
        name: 'Masha',
        interests: ['dinosaurs', 'dinosaurs', 'space'],
      });

      expect(mockPrismaService.child.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          interests: ['dinosaurs', 'space'],
        }),
      });
    });

    it('handles optional fields', async () => {
      mockPrismaService.child.create.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
        birthDate: null,
        interests: [],
        readingLevel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createChild('user-1', {
        name: 'Masha',
      });

      expect(mockPrismaService.child.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Masha',
          interests: [],
        }),
      });
    });
  });

  describe('updateChild', () => {
    it('updates a child owned by the user', async () => {
      mockPrismaService.child.findFirst.mockResolvedValue({ id: 'child-1' });
      mockPrismaService.child.update.mockResolvedValue({
        id: 'child-1',
        name: 'Updated Name',
        birthDate: null,
        interests: ['space'],
        readingLevel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateChild('user-1', 'child-1', {
        name: '  Updated Name  ',
        interests: ['space'],
      });

      expect(result.name).toBe('Updated Name');
    });

    it('throws NotFoundException when child not owned', async () => {
      mockPrismaService.child.findFirst.mockResolvedValue(null);

      await expect(
        service.updateChild('user-1', 'child-1', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteChild', () => {
    it('deletes a child owned by the user', async () => {
      mockPrismaService.child.findFirst.mockResolvedValue({ id: 'child-1' });
      mockPrismaService.child.delete.mockResolvedValue({});

      await service.deleteChild('user-1', 'child-1');

      expect(mockPrismaService.child.delete).toHaveBeenCalledWith({
        where: { id: 'child-1' },
      });
    });

    it('throws NotFoundException when child not owned', async () => {
      mockPrismaService.child.findFirst.mockResolvedValue(null);

      await expect(service.deleteChild('user-1', 'child-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
