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

type EmployeeInvitationInput = {
  email: string;
  inviterName: string;
  invitationUrl: string;
  language: 'zh' | 'en' | 'fr';
  storeName: string;
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
  notificationLabel?: string;
  automatedFooter?: string;
};

type EmployeeInvitationCopy = Omit<
  TemplateCopy,
  'body' | 'subject' | 'title'
> & {
  subject: (storeName: string) => string;
  title: (storeName: string) => string;
  body: (storeName: string, inviterName: string) => string;
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
    subject: "ZHAO's Family 邮箱验证码",
    title: '邮箱验证码',
    body: (code) => `你的验证码是 ${code}。`,
    footer: '验证码将在短时间内失效。如果不是你本人操作，请忽略这封邮件。',
  },
  en: {
    subject: "ZHAO's Family email verification code",
    title: 'Email verification code',
    body: (code) => `Your verification code is ${code}.`,
    footer:
      'This code expires soon. If you did not request it, ignore this email.',
  },
  fr: {
    subject: "Code de vérification ZHAO's Family",
    title: 'Code de vérification',
    body: (code) => `Votre code de vérification est ${code}.`,
    footer:
      "Ce code expire rapidement. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  },
};

const RESET_PASSWORD_COPY: Record<string, TemplateCopy> = {
  zh: {
    subject: "ZHAO's Family 密码重置",
    title: '密码重置',
    body: '你的账号收到了一次密码重置请求。',
    actionLabel: '重置密码',
    footer: '链接将在 30 分钟后失效。如果不是你本人操作，请忽略这封邮件。',
  },
  en: {
    subject: "ZHAO's Family password reset",
    title: 'Password reset',
    body: 'A password reset request was created for your account.',
    actionLabel: 'Reset password',
    footer:
      'This link expires in 30 minutes. If you did not request this, ignore this email.',
  },
  fr: {
    subject: "Réinitialisation du mot de passe ZHAO's Family",
    title: 'Réinitialisation du mot de passe',
    body: 'Une demande de réinitialisation du mot de passe a été créée pour votre compte.',
    actionLabel: 'Réinitialiser le mot de passe',
    footer:
      "Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  },
};

const PENDING_APPROVAL_COPY: Record<string, TemplateCopy> = {
  zh: {
    subject: "ZHAO's Family 注册申请已提交",
    title: '等待门店管理员审核',
    body: '你的注册申请已经提交。门店管理员审核通过后，你就可以登录平台。',
    footer: '如需加急处理，请联系你的门店负责人。',
  },
  en: {
    subject: "ZHAO's Family registration submitted",
    title: 'Waiting for manager approval',
    body: 'Your registration request has been submitted. You can sign in after your store manager approves it.',
    footer: 'Contact your store manager if this needs urgent handling.',
  },
  fr: {
    subject: "Demande d’inscription ZHAO's Family envoyée",
    title: 'En attente de validation',
    body: 'Votre demande d’inscription a été envoyée. Vous pourrez vous connecter après validation par un responsable.',
    footer:
      'Contactez votre responsable de boutique si le traitement est urgent.',
  },
};

const APPROVED_COPY: Record<string, TemplateCopy> = {
  zh: {
    subject: "ZHAO's Family 账号已通过审核",
    title: '账号已通过审核',
    body: '你的账号已经通过审核，现在可以登录平台。',
    actionLabel: '进入平台',
    footer: "欢迎加入 ZHAO's Family。",
  },
  en: {
    subject: "ZHAO's Family account approved",
    title: 'Your account is approved',
    body: 'Your account has been approved. You can now sign in.',
    actionLabel: 'Open platform',
    footer: "Welcome to ZHAO's Family.",
  },
  fr: {
    subject: "Compte ZHAO's Family validé",
    title: 'Votre compte est validé',
    body: 'Votre compte a été validé. Vous pouvez maintenant vous connecter.',
    actionLabel: 'Ouvrir la plateforme',
    footer: "Bienvenue chez ZHAO's Family.",
  },
};

const EMPLOYEE_INVITATION_COPY: Record<string, EmployeeInvitationCopy> = {
  zh: {
    subject: (storeName) => `加入 ${storeName} 的邀请｜ZHAO`,
    title: (storeName) => `欢迎加入 ${storeName}`,
    body: (storeName, inviterName) =>
      `${inviterName} 邀请你加入 ${storeName}。点击下方按钮填写姓名并设置登录密码；完成后即可登录 ZHAO's Family。`,
    actionLabel: '完成入职设置',
    footer:
      '此邀请链接将在 7 天后失效，且只能使用一次。若你并不认识邀请人，请忽略此邮件。',
    notificationLabel: '员工入职邀请',
    automatedFooter:
      '这是一封系统自动发送的邮件。如有问题，请联系你的门店负责人或平台支持团队。',
  },
  en: {
    subject: (storeName) => `Invitation to join ${storeName} | ZHAO`,
    title: (storeName) => `Welcome to ${storeName}`,
    body: (storeName, inviterName) =>
      `${inviterName} invited you to join ${storeName}. Use the button below to enter your name and create your sign-in password. You can sign in to ZHAO's Family straight away once you are done.`,
    actionLabel: 'Complete account setup',
    footer:
      'This invitation link expires in 7 days and can only be used once. If you do not recognise the inviter, you can safely ignore this email.',
    notificationLabel: 'Employee invitation',
    automatedFooter:
      'This is an automated email. For help, contact your store manager or the platform support team.',
  },
  fr: {
    subject: (storeName) => `Invitation à rejoindre ${storeName} | ZHAO`,
    title: (storeName) => `Bienvenue chez ${storeName}`,
    body: (storeName, inviterName) =>
      `${inviterName} vous invite à rejoindre ${storeName}. Utilisez le bouton ci-dessous pour renseigner votre nom et créer votre mot de passe de connexion. Vous pourrez vous connecter à ZHAO's Family dès cette étape terminée.`,
    actionLabel: 'Finaliser mon compte',
    footer:
      'Ce lien d’invitation expire dans 7 jours et ne peut être utilisé qu’une seule fois. Si vous ne reconnaissez pas l’expéditeur, vous pouvez ignorer cet email.',
    notificationLabel: 'Invitation collaborateur',
    automatedFooter:
      'Ceci est un email automatique. Pour toute question, contactez votre responsable de boutique ou le support de la plateforme.',
  },
};

const ORDER_PDF_COPY: Record<
  string,
  Omit<TemplateCopy, 'body'> & { body: (orderNumber: string) => string }
> = {
  zh: {
    subject: "ZHAO's Family 订单 PDF 已生成",
    title: '订单 PDF 已生成',
    body: (orderNumber) =>
      `订单 ${orderNumber} 的 PDF 已生成，附件中可以查看。`,
    footer: '这是一封系统自动发送的邮件。',
  },
  en: {
    subject: "ZHAO's Family order PDF generated",
    title: 'Order PDF generated',
    body: (orderNumber) =>
      `The PDF for order ${orderNumber} has been generated. You can find it attached.`,
    footer: 'This is an automated platform email.',
  },
  fr: {
    subject: "PDF de commande ZHAO's Family généré",
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
    ? `<img src="${escapeHtml(logoUrl)}" width="132" alt="ZHAO's Family" style="display:block;width:132px;max-width:132px;height:auto;border:0;outline:none;text-decoration:none;">`
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
    `<div style="font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.86;">${escapeHtml(copy.notificationLabel ?? 'Notification interne')}</div>`,
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
    `<td style="padding:14px 0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND_MUTED};">ZHAO's Family</td>`,
    `<td align="right" style="padding:14px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${BRAND_INK};">ZHAO's Family</td>`,
    '</tr>',
    '</table>',
    `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${BRAND_MUTED};">${escapeHtml(copy.footer)}</p>`,
    '</td>',
    '</tr>',
    '<tr>',
    `<td style="padding:20px 34px 28px;background:#faf7f5;border-top:1px solid #eee3df;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND_MUTED};">`,
    '<strong style="color:#2b2b2b;">ZHAO\'s Family</strong><br>',
    escapeHtml(
      copy.automatedFooter ??
        'Email automatique interne. Pour toute question, contactez votre responsable ou le support de la plateforme.',
    ),
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

  async sendEmployeeInvitationEmail(
    input: EmployeeInvitationInput,
  ): Promise<MailSendResult> {
    const copy = getLocalizedCopy(EMPLOYEE_INVITATION_COPY, input.language);
    const brand = this.getBrandEmailOptions();
    const invitationCopy: TemplateCopy = {
      ...copy,
      subject: copy.subject(input.storeName),
      title: copy.title(input.storeName),
      body: copy.body(input.storeName, input.inviterName),
    };

    return this.sendEmail({
      to: input.email,
      subject: invitationCopy.subject,
      text: buildTextEmail(invitationCopy, input.invitationUrl),
      html: buildHtmlEmail(invitationCopy, input.invitationUrl, brand),
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
