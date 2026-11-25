import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  GoogleSignInDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
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

  /** Emails a reset code. The answer is the same whether or not the account exists. */
  // Nobody's inbox may be filled with codes.
  @Throttle({ default: { limit: 5, ttl: 3_600_000 }, address: { limit: 60, ttl: 3_600_000 } })
  @Post('password/forgot')
  @HttpCode(202)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.auth.forgotPassword(dto.email, dto.lang);
  }

  /** Sets a new password with the emailed code and signs in; other devices are signed out. */
  @Post('password/reset')
  @HttpCode(200)
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<TokenPairDto> {
    return this.auth.resetPassword(dto, userAgent);
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
