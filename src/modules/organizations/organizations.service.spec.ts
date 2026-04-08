import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './organizations.entity';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<Repository<Organization>>;

  beforeEach(async () => {
    organizationRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Organization>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
      ],
    }).compile();

    service = module.get(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const actor = (role: UserRole): AccessTokenPayload => ({
    sub: 'user-1',
    organizationId: 'org-1',
    role,
  });

  describe('getMe', () => {
    it('returns organization for actor org', async () => {
      const org = {
        id: 'org-1',
        name: 'Acme',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Organization;

      organizationRepository.findOne.mockResolvedValue(org);

      const result = await service.getMe(actor(UserRole.EMPLOYEE));

      expect(result).toEqual({
        id: org.id,
        name: org.name,
        ownerId: org.ownerId,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-1', deletedAt: IsNull() },
      });
    });

    it('throws NotFoundException when organization missing', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.getMe(actor(UserRole.OWNER))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateMe', () => {
    it('updates name and returns dto', async () => {
      const org = {
        id: 'org-1',
        name: 'Old',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Organization;
      const dto: UpdateOrganizationDto = { name: 'New Name' };
      const saved = { ...org, name: 'New Name' } as Organization;

      organizationRepository.findOne.mockResolvedValue(org);
      organizationRepository.save.mockResolvedValue(saved);

      const result = await service.updateMe(dto, actor(UserRole.OWNER));

      expect(result.name).toBe('New Name');
      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(organizationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' }),
      );
    });

    it('throws NotFoundException when organization missing', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMe({ name: 'X' }, actor(UserRole.OWNER)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
