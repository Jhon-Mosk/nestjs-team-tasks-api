import { Body, Controller, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Configuration } from 'src/config/confuguration';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
      path: '/auth/refresh',
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

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    return { ok: true };
  }

  // @Post('refresh')
  // async refresh(@Req() req: Request) {
  //   const refreshToken = req.cookies?.refresh_token;
  //   return await this.authService.refresh(refreshToken);
  // }
}
