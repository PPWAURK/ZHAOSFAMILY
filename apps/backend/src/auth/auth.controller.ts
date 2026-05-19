import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import {
  AuthService,
  type AuthUser,
  type ForgotPasswordResponse,
  type LoginResponse,
  type RegisterResponse,
} from './auth.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { parseBearerToken } from './auth-token.utils';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  refresh(
    @Headers('authorization') authorization?: string,
  ): Promise<LoginResponse> {
    return this.authService.refresh(parseBearerToken(authorization));
  }

  @Post('accept-invitation')
  acceptInvitation(@Body() dto: AcceptInvitationDto): Promise<LoginResponse> {
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

  @Post('logout')
  logout(): { message: 'LOGGED_OUT' } {
    return { message: 'LOGGED_OUT' };
  }
}
