import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  SendEmailDto,
  SendVerificationCodeEmailDto,
} from './dto/send-email.dto';
import { MailService, type MailSendResult } from './mail.service';
import { RequirePermissions } from '../auth/permissions';
import { PermissionGuard } from '../auth/guards/permission.guard';

@Controller('mail')
@UseGuards(PermissionGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @RequirePermissions('system.permission.manage')
  @Post('test')
  sendTestEmail(@Body() dto: SendEmailDto): Promise<MailSendResult> {
    return this.mailService.sendEmail(dto);
  }

  @RequirePermissions('system.permission.manage')
  @Post('test-verification-code')
  sendTestVerificationCode(
    @Body() dto: SendVerificationCodeEmailDto,
  ): Promise<MailSendResult> {
    return this.mailService.sendVerificationCodeEmail({
      to: dto.to,
      code: dto.code ?? '123456',
      language: dto.language,
    });
  }
}
