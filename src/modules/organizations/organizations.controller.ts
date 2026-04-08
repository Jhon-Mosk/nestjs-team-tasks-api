import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Auth } from 'src/common/decorators/auth.decorator';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Auth()
  @Get('me')
  getMyOrganization(
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.getMe(req.user);
  }

  @Auth(UserRole.OWNER)
  @Patch('me')
  updateMyOrganization(
    @Body() dto: UpdateOrganizationDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.updateMe(dto, req.user);
  }
}
