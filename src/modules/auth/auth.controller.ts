import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ApiErrorResponses } from 'src/common/swagger/api-error-responses';
import { Configuration } from 'src/config/confuguration';
import { AuthService } from './auth.service';
import { AccessTokenResponseDto } from './dto/access-token-response.dto';
import { LoginDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { OkResponseDto } from './dto/ok-response.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload } from './types/jwt-payload';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    refreshTtlSec: number,
  ) {
    const nodeEnv =
      this.configService.getOrThrow<Configuration['nodeEnv']>('nodeEnv');

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: nodeEnv === 'production' ? true : false,
      sameSite: nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: refreshTtlSec * 1000,
      path: '/auth',
    });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register organization + owner user' })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiErrorResponses({
    conflict: true,
    unprocessable: true,
    serviceUnavailable: true,
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, refreshTtlSec } =
      await this.authService.register(dto);

    this.setRefreshTokenCookie(res, refreshToken, refreshTtlSec);

    return { accessToken } satisfies AccessTokenResponseDto;
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login (sets refresh cookie, returns access token)',
  })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiErrorResponses({
    unauthorized: true,
    unprocessable: true,
    serviceUnavailable: true,
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, refreshTtlSec } =
      await this.authService.login(dto);

    this.setRefreshTokenCookie(res, refreshToken, refreshTtlSec);

    return { accessToken } satisfies AccessTokenResponseDto;
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token (uses httpOnly refresh cookie)',
  })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiErrorResponses({ unauthorized: true, serviceUnavailable: true })
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return (await this.authService.refresh(
      refreshToken,
    )) satisfies AccessTokenResponseDto;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (invalidates refresh session)' })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiErrorResponses({ serviceUnavailable: true })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (!refreshToken) return { ok: true } satisfies OkResponseDto;

    const { shouldClearCookie } = await this.authService.logout(refreshToken);

    if (shouldClearCookie) res.clearCookie('refresh_token', { path: '/auth' });

    return { ok: true } satisfies OkResponseDto;
  }

  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses({ unauthorized: true })
  @Get('me')
  async me(@Req() req: Request & { user: AccessTokenPayload }) {
    const userId = req.user.sub;
    return await this.authService.me(userId);
  }
}
