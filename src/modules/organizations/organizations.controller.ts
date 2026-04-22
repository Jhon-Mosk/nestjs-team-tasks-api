import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ApiErrorResponses } from 'src/common/swagger/api-error-responses';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Auth()
  @ApiOperation({ summary: 'Get my organization' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiErrorResponses({ unauthorized: true, notFound: true })
  @Get('me')
  getMyOrganization(
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.getMe(req.user);
  }

  @Auth(UserRole.OWNER)
  @ApiOperation({ summary: 'Update my organization (OWNER only)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiErrorResponses({
    unauthorized: true,
    forbidden: true,
    notFound: true,
    unprocessable: true,
  })
  @Patch('me')
  updateMyOrganization(
    @Body() dto: UpdateOrganizationDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.updateMe(dto, req.user);
  }
}
