import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  GoogleSignInDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  TokenPairDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<TokenPairDto> {
    return this.auth.register(dto, userAgent);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<TokenPairDto> {
    return this.auth.login(dto, userAgent);
  }

  /** Sign in or sign up with Google. */
  @Post('google')
  @HttpCode(200)
  google(
    @Body() dto: GoogleSignInDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<TokenPairDto> {
    return this.auth.google(dto.idToken, userAgent);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body() dto: RefreshDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<TokenPairDto> {
    return this.auth.refresh(dto.refreshToken, userAgent);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: RefreshDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }
}
