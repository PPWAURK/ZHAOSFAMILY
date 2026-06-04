import { Body, Controller, Post } from '@nestjs/common';
import {
  SendEmailDto,
  SendVerificationCodeEmailDto,
} from './dto/send-email.dto';
import { MailService, type MailSendResult } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  sendTestEmail(@Body() dto: SendEmailDto): Promise<MailSendResult> {
    return this.mailService.sendEmail(dto);
  }

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
