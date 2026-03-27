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
import type { Request, Response } from 'express';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Configuration } from 'src/config/confuguration';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload } from './types/jwt-payload';

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
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, refreshTtlSec } =
      await this.authService.register(dto);

    this.setRefreshTokenCookie(res, refreshToken, refreshTtlSec);

    return { accessToken };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, refreshTtlSec } =
      await this.authService.login(dto);

    this.setRefreshTokenCookie(res, refreshToken, refreshTtlSec);

    return { accessToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return await this.authService.refresh(refreshToken);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (!refreshToken) return { ok: true };

    const { shouldClearCookie } = await this.authService.logout(refreshToken);

    if (shouldClearCookie) res.clearCookie('refresh_token', { path: '/auth' });

    return { ok: true };
  }

  @Auth()
  @Get('me')
  async me(@Req() req: Request & { user: AccessTokenPayload }) {
    const userId = req.user.sub;
    return await this.authService.me(userId);
  }
}
