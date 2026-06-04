import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import {
  AuthService,
  type AuthUser,
  type AuthSessionResponse,
  type ForgotPasswordResponse,
  type RegisterResponse,
} from './auth.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ChangeCurrentPasswordDto } from './dto/change-current-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { parseBearerToken } from './auth-token.utils';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthSessionResponse> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshSessionDto): Promise<AuthSessionResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('accept-invitation')
  acceptInvitation(
    @Body() dto: AcceptInvitationDto,
  ): Promise<AuthSessionResponse> {
    return this.authService.acceptInvitation(dto);
  }

  @Post('forgot-password')
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: 'PASSWORD_RESET' }> {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  getMe(@Headers('authorization') authorization?: string): Promise<AuthUser> {
    return this.authService.getCurrentUser(parseBearerToken(authorization));
  }

  @Post('me')
  postMe(@Headers('authorization') authorization?: string): Promise<AuthUser> {
    return this.authService.getCurrentUser(parseBearerToken(authorization));
  }

  @Patch('me')
  updateMe(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateCurrentUserDto,
  ): Promise<AuthUser> {
    return this.authService.updateCurrentUser(
      parseBearerToken(authorization),
      dto,
    );
  }

  @Patch('me/password')
  changeCurrentPassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: ChangeCurrentPasswordDto,
  ): Promise<{ message: 'PASSWORD_CHANGED' }> {
    return this.authService.changeCurrentPassword(
      parseBearerToken(authorization),
      dto,
    );
  }

  @Post('logout')
  async logout(@Body() dto: LogoutDto): Promise<{ message: 'LOGGED_OUT' }> {
    await this.authService.logout(dto.refreshToken);
    return { message: 'LOGGED_OUT' };
  }
}
