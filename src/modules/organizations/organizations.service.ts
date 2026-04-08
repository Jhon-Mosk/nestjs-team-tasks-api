import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './organizations.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  private toDto(org: Organization): OrganizationResponseDto {
    return {
      id: org.id,
      name: org.name,
      ownerId: org.ownerId,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  async getMe(actor: AccessTokenPayload): Promise<OrganizationResponseDto> {
    const org = await this.organizationRepository.findOne({
      where: { id: actor.organizationId, deletedAt: IsNull() },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return this.toDto(org);
  }

  async updateMe(
    dto: UpdateOrganizationDto,
    actor: AccessTokenPayload,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationRepository.findOne({
      where: { id: actor.organizationId, deletedAt: IsNull() },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    org.name = dto.name;
    const saved = await this.organizationRepository.save(org);
    return this.toDto(saved);
  }
}
