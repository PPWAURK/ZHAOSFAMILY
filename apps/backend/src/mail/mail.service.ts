import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient, type Brevo } from '@getbrevo/brevo';
import { SendEmailDto } from './dto/send-email.dto';

export type MailSendResult = {
  messageId?: string;
  messageIds?: string[];
};

type VerificationCodeInput = {
  to: string | string[];
  code: string;
  language?: string;
};

type ResetPasswordInput = {
  email: string;
  language?: string;
  resetUrl: string;
};

type EmployeeApprovalInput = {
  to: string | string[];
  employeeName: string;
  language?: string;
};

type OrderPdfInput = {
  to: string | string[];
  orderNumber: string;
  pdfBase64: string;
  fileName?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  language?: string;
};

type TemplateCopy = {
  subject: string;
  title: string;
  body: string;
  actionLabel?: string;
  footer: string;
};

const DEFAULT_LANGUAGE = 'fr';
const BRAND_RED = '#d4111a';
const BRAND_INK = '#171717';
const BRAND_MUTED = '#686868';
const BRAND_SURFACE = '#fff7f3';
const DEFAULT_LOGO_URL =
  'https://raw.githubusercontent.com/PPWAURK/ZHAOSFAMILY/refs/heads/main/apps/web/public/logo2024/logozhao%E6%AD%A3%E6%96%B9%E5%BD%A2.jpg';

const VERIFICATION_COPY: Record<
  string,
  Omit<TemplateCopy, 'body'> & { body: (code: string) => string }
> = {
  zh: {
    subject: 'ZHAO Plateforme 邮箱验证码',
    title: '邮箱验证码',
    body: (code) => `你的验证码是 ${code}。`,
    footer: '验证码将在短时间内失效。如果不是你本人操作，请忽略这封邮件。',
  },
  en: {
    subject: 'ZHAO Plateforme email verification code',
    title: 'Email verification code',
    body: (code) => `Your verification code is ${code}.`,
    footer:
      'This code expires soon. If you did not request it, ignore this email.',
  },
  fr: {
    subject: 'Code de vérification ZHAO Plateforme',
    title: 'Code de vérification',
    body: (code) => `Votre code de vérification est ${code}.`,
    footer:
      "Ce code expire rapidement. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  },
};

const RESET_PASSWORD_COPY: Record<string, TemplateCopy> = {
  zh: {
    subject: 'ZHAO Plateforme 密码重置',
    title: '密码重置',
    body: '你的账号收到了一次密码重置请求。',
    actionLabel: '重置密码',
    footer: '链接将在 30 分钟后失效。如果不是你本人操作，请忽略这封邮件。',
  },
  en: {
    subject: 'ZHAO Plateforme password reset',
    title: 'Password reset',
    body: 'A password reset request was created for your account.',
    actionLabel: 'Reset password',
    footer:
      'This link expires in 30 minutes. If you did not request this, ignore this email.',
  },
  fr: {
    subject: 'Réinitialisation du mot de passe ZHAO Plateforme',
    title: 'Réinitialisation du mot de passe',
    body: 'Une demande de réinitialisation du mot de passe a été créée pour votre compte.',
    actionLabel: 'Réinitialiser le mot de passe',
    footer:
      "Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  },
};

const PENDING_APPROVAL_COPY: Record<string, TemplateCopy> = {
  zh: {
    subject: 'ZHAO Plateforme 注册申请已提交',
    title: '等待门店管理员审核',
    body: '你的注册申请已经提交。门店管理员审核通过后，你就可以登录平台。',
    footer: '如需加急处理，请联系你的门店负责人。',
  },
  en: {
    subject: 'ZHAO Plateforme registration submitted',
    title: 'Waiting for manager approval',
    body: 'Your registration request has been submitted. You can sign in after your store manager approves it.',
    footer: 'Contact your store manager if this needs urgent handling.',
  },
  fr: {
    subject: 'Demande d’inscription ZHAO Plateforme envoyée',
    title: 'En attente de validation',
    body: 'Votre demande d’inscription a été envoyée. Vous pourrez vous connecter après validation par un responsable.',
    footer:
      'Contactez votre responsable de boutique si le traitement est urgent.',
  },
};

const APPROVED_COPY: Record<string, TemplateCopy> = {
  zh: {
    subject: 'ZHAO Plateforme 账号已通过审核',
    title: '账号已通过审核',
    body: '你的账号已经通过审核，现在可以登录平台。',
    actionLabel: '进入平台',
    footer: '欢迎加入 ZHAO Plateforme。',
  },
  en: {
    subject: 'ZHAO Plateforme account approved',
    title: 'Your account is approved',
    body: 'Your account has been approved. You can now sign in.',
    actionLabel: 'Open platform',
    footer: 'Welcome to ZHAO Plateforme.',
  },
  fr: {
    subject: 'Compte ZHAO Plateforme validé',
    title: 'Votre compte est validé',
    body: 'Votre compte a été validé. Vous pouvez maintenant vous connecter.',
    actionLabel: 'Ouvrir la plateforme',
    footer: 'Bienvenue sur ZHAO Plateforme.',
  },
};

const ORDER_PDF_COPY: Record<
  string,
  Omit<TemplateCopy, 'body'> & { body: (orderNumber: string) => string }
> = {
  zh: {
    subject: 'ZHAO Plateforme 订单 PDF 已生成',
    title: '订单 PDF 已生成',
    body: (orderNumber) =>
      `订单 ${orderNumber} 的 PDF 已生成，附件中可以查看。`,
    footer: '这是一封系统自动发送的邮件。',
  },
  en: {
    subject: 'ZHAO Plateforme order PDF generated',
    title: 'Order PDF generated',
    body: (orderNumber) =>
      `The PDF for order ${orderNumber} has been generated. You can find it attached.`,
    footer: 'This is an automated platform email.',
  },
  fr: {
    subject: 'PDF de commande ZHAO Plateforme généré',
    title: 'PDF de commande généré',
    body: (orderNumber) =>
      `Le PDF de la commande ${orderNumber} a été généré. Vous le trouverez en pièce jointe.`,
    footer: 'Ceci est un email automatique de la plateforme.',
  },
};

function normalizeRecipients(value: string | string[]): { email: string }[] {
  return (Array.isArray(value) ? value : [value]).map((email) => ({ email }));
}

function normalizeOptionalRecipients(
  value: string[] | undefined,
): { email: string }[] | undefined {
  return value?.length ? normalizeRecipients(value) : undefined;
}

function getLocalizedCopy<T>(copyMap: Record<string, T>, language?: string): T {
  return copyMap[language || DEFAULT_LANGUAGE] ?? copyMap[DEFAULT_LANGUAGE];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTextEmail(copy: TemplateCopy, actionUrl?: string): string {
  return [
    copy.title,
    '',
    copy.body,
    actionUrl ? `${copy.actionLabel ?? 'Open'}: ${actionUrl}` : '',
    '',
    copy.footer,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function buildHtmlEmail(
  copy: TemplateCopy,
  actionUrl?: string,
  brand?: { appWebUrl: string; logoUrl: string },
): string {
  const actionHtml =
    actionUrl && copy.actionLabel
      ? [
          '<tr>',
          '<td style="padding:8px 0 26px;">',
          `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${BRAND_RED};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:.02em;padding:14px 22px;border-radius:0;">${escapeHtml(copy.actionLabel)}</a>`,
          '</td>',
          '</tr>',
        ].join('')
      : '';
  const appWebUrl = brand?.appWebUrl;
  const logoUrl = brand?.logoUrl;
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="132" alt="ZHAO Plateforme" style="display:block;width:132px;max-width:132px;height:auto;border:0;outline:none;text-decoration:none;">`
    : `<div style="font-family:Arial,sans-serif;font-size:28px;line-height:1;font-weight:900;letter-spacing:.02em;color:${BRAND_RED};">ZHAO</div>`;
  const homeLinkStart = appWebUrl
    ? `<a href="${escapeHtml(appWebUrl)}" style="text-decoration:none;">`
    : '';
  const homeLinkEnd = appWebUrl ? '</a>' : '';

  return [
    '<!doctype html>',
    '<html>',
    '<body style="margin:0;padding:0;background:#f4f1ee;">',
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(copy.body)}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1ee;margin:0;padding:32px 12px;">',
    '<tr>',
    '<td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #eadeda;">',
    '<tr>',
    `<td style="padding:0;background:${BRAND_RED};">`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '<tr>',
    '<td style="padding:26px 34px 24px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '<tr>',
    `<td align="left"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;"><tr><td style="padding:10px 13px;">${homeLinkStart}${logoHtml}${homeLinkEnd}</td></tr></table></td>`,
    '<td align="right" style="font-family:Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#ffffff;">ZHAO\'s Family</td>',
    '</tr>',
    '<tr>',
    `<td colspan="2" style="padding-top:24px;font-family:Arial,sans-serif;color:#ffffff;">`,
    '<div style="font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.86;">Notification interne</div>',
    `<div style="font-size:30px;line-height:1.18;font-weight:900;margin-top:8px;">${escapeHtml(copy.title)}</div>`,
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="padding:34px 34px 32px;">',
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND_SURFACE};border:1px solid #f0d9d2;margin:0 0 24px;"><tr><td style="padding:22px 24px;font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:${BRAND_INK};">${escapeHtml(copy.body)}</td></tr></table>`,
    actionHtml,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:2px 0 22px;border-top:1px solid #eee3df;border-bottom:1px solid #eee3df;">',
    '<tr>',
    `<td style="padding:14px 0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND_MUTED};">Plateforme entreprise</td>`,
    `<td align="right" style="padding:14px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${BRAND_INK};">ZHAO Groupe</td>`,
    '</tr>',
    '</table>',
    `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${BRAND_MUTED};">${escapeHtml(copy.footer)}</p>`,
    '</td>',
    '</tr>',
    '<tr>',
    `<td style="padding:20px 34px 28px;background:#faf7f5;border-top:1px solid #eee3df;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND_MUTED};">`,
    '<strong style="color:#2b2b2b;">ZHAO Plateforme</strong><br>',
    'Email automatique interne. Pour toute question, contactez votre responsable ou le support de la plateforme.',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private brevoClient: BrevoClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(dto: SendEmailDto): Promise<MailSendResult> {
    if (!dto.html && !dto.text) {
      throw new Error('MAIL_CONTENT_REQUIRED');
    }

    const response = await this.sendBrevoEmail({
      sender: this.getSender(),
      to: normalizeRecipients(dto.to),
      cc: normalizeOptionalRecipients(dto.cc),
      bcc: normalizeOptionalRecipients(dto.bcc),
      replyTo: dto.replyTo ? { email: dto.replyTo } : undefined,
      subject: dto.subject,
      htmlContent: dto.html,
      textContent: dto.text,
      attachment: dto.attachments?.map((attachment) => ({
        name: attachment.name,
        content: attachment.content,
      })),
    });

    return response;
  }

  async sendHtmlEmail(
    input: Omit<SendEmailDto, 'text'> & { html: string },
  ): Promise<MailSendResult> {
    return this.sendEmail(input);
  }

  async sendTextEmail(
    input: Omit<SendEmailDto, 'html'> & { text: string },
  ): Promise<MailSendResult> {
    return this.sendEmail(input);
  }

  async sendVerificationCodeEmail(
    input: VerificationCodeInput,
  ): Promise<MailSendResult> {
    const copy = getLocalizedCopy(VERIFICATION_COPY, input.language);
    const body = copy.body(input.code);
    const brand = this.getBrandEmailOptions();

    return this.sendEmail({
      to: input.to,
      subject: copy.subject,
      text: buildTextEmail({ ...copy, body }),
      html: buildHtmlEmail({ ...copy, body }, undefined, brand),
    });
  }

  async sendResetPasswordEmail(
    input: ResetPasswordInput,
  ): Promise<MailSendResult> {
    const copy = getLocalizedCopy(RESET_PASSWORD_COPY, input.language);
    const brand = this.getBrandEmailOptions();

    return this.sendEmail({
      to: input.email,
      subject: copy.subject,
      text: buildTextEmail(copy, input.resetUrl),
      html: buildHtmlEmail(copy, input.resetUrl, brand),
    });
  }

  async sendEmployeePendingApprovalEmail(
    input: EmployeeApprovalInput,
  ): Promise<MailSendResult> {
    const copy = getLocalizedCopy(PENDING_APPROVAL_COPY, input.language);
    const brand = this.getBrandEmailOptions();

    return this.sendEmail({
      to: input.to,
      subject: copy.subject,
      text: buildTextEmail(copy),
      html: buildHtmlEmail(copy, undefined, brand),
    });
  }

  async sendEmployeeApprovedEmail(
    input: EmployeeApprovalInput,
  ): Promise<MailSendResult> {
    const copy = getLocalizedCopy(APPROVED_COPY, input.language);
    const appWebUrl = this.getAppWebUrl();
    const brand = this.getBrandEmailOptions();

    return this.sendEmail({
      to: input.to,
      subject: copy.subject,
      text: buildTextEmail(copy, appWebUrl),
      html: buildHtmlEmail(copy, appWebUrl, brand),
    });
  }

  async sendOrderPdfEmail(input: OrderPdfInput): Promise<MailSendResult> {
    const copy = getLocalizedCopy(ORDER_PDF_COPY, input.language);
    const body = copy.body(input.orderNumber);
    const brand = this.getBrandEmailOptions();

    return this.sendEmail({
      to: input.to,
      subject: copy.subject,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      text: buildTextEmail({ ...copy, body }),
      html: buildHtmlEmail({ ...copy, body }, undefined, brand),
      attachments: [
        {
          name: input.fileName ?? `order-${input.orderNumber}.pdf`,
          content: input.pdfBase64,
        },
      ],
    });
  }

  private async sendBrevoEmail(
    request: Brevo.SendTransacEmailRequest,
  ): Promise<MailSendResult> {
    try {
      const response =
        await this.getBrevoClient().transactionalEmails.sendTransacEmail(
          request,
        );

      this.logger.log(
        `Brevo email accepted: ${response.messageId ?? response.messageIds?.join(', ') ?? 'no-message-id'}`,
      );

      return {
        messageId: response.messageId,
        messageIds: response.messageIds,
      };
    } catch (error) {
      this.logger.error(
        `Brevo email send failed: ${this.formatBrevoError(error)}`,
      );
      throw new Error('BREVO_EMAIL_SEND_FAILED');
    }
  }

  private getBrevoClient(): BrevoClient {
    if (this.brevoClient) {
      return this.brevoClient;
    }

    const apiKey = this.configService.get<string>('BREVO_API_KEY');

    if (!apiKey) {
      throw new Error('BREVO_API_KEY_REQUIRED');
    }

    this.brevoClient = new BrevoClient({ apiKey });

    return this.brevoClient;
  }

  private getSender(): Brevo.SendTransacEmailRequest.Sender {
    const email = this.configService.get<string>('MAIL_FROM_EMAIL');
    const name = this.configService.get<string>('MAIL_FROM_NAME');

    if (!email) {
      throw new Error('MAIL_FROM_EMAIL_REQUIRED');
    }

    return name ? { email, name } : { email };
  }

  private getAppWebUrl(): string {
    return this.normalizeBaseUrl(
      this.configService.get<string>('APP_WEB_URL') ||
        'https://zhaosfamily.com',
    );
  }

  private getBrandEmailOptions(): { appWebUrl: string; logoUrl: string } {
    const appWebUrl = this.getAppWebUrl();

    return {
      appWebUrl,
      logoUrl:
        this.configService.get<string>('MAIL_LOGO_URL') || DEFAULT_LOGO_URL,
    };
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private formatBrevoError(error: unknown): string {
    if (error instanceof Error) {
      return error.message.replace(
        this.configService.get<string>('BREVO_API_KEY') || '',
        '[redacted]',
      );
    }

    try {
      return JSON.stringify(error).replace(
        this.configService.get<string>('BREVO_API_KEY') || '',
        '[redacted]',
      );
    } catch {
      return 'UNKNOWN_BREVO_ERROR';
    }
  }
}
