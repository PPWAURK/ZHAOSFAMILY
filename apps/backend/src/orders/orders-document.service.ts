import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { OrderDocumentInput, OrdersRequestContext } from './orders.types';

type PdfDoc = InstanceType<typeof PDFDocument>;

@Injectable()
export class OrdersDocumentService {
  private readonly logger = new Logger(OrdersDocumentService.name);
  private readonly storageRoot =
    process.env.STORAGE_ROOT_PATH ?? join(process.cwd(), 'uploads');
  private readonly publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL;
  private readonly ordersDir = join(this.storageRoot, 'orders');
  private readonly cjkFontCandidatePaths = [
    join(
      process.cwd(),
      'assets',
      'fonts',
      'Noto_Sans_SC',
      'static',
      'NotoSansSC-Regular.ttf',
    ),
    join(process.cwd(), 'assets', 'fonts', 'NotoSansSC-Regular.ttf'),
    '/System/Library/Fonts/Hiragino Sans GB.ttc',
    '/System/Library/Fonts/STHeiti Medium.ttc',
  ];
  private readonly cjkFontPath = this.cjkFontCandidatePaths.find((path) =>
    existsSync(path),
  );

  constructor() {
    mkdirSync(this.ordersDir, { recursive: true });
  }

  buildOrderFilePath(fileName: string): string {
    return join(this.ordersDir, fileName);
  }

  buildOrderUrl(req: OrdersRequestContext, orderId: number): string {
    return this.buildApiUrl(req, `/orders/${orderId}/commande`);
  }

  resolveExistingOrderFile(fileName: string): string {
    const filePath = this.buildOrderFilePath(fileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException('ORDER_FILE_NOT_FOUND');
    }

    return filePath;
  }

  deleteFileIfExists(filePath: string | null): void {
    if (!filePath || !existsSync(filePath)) {
      return;
    }

    try {
      unlinkSync(filePath);
    } catch (error) {
      this.logger.warn(
        `Failed to delete order file: ${filePath}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async generateCommandePdf(input: OrderDocumentInput): Promise<void> {
    mkdirSync(this.ordersDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36 });
      const stream = createWriteStream(input.filePath);

      doc.pipe(stream);
      this.registerFont(doc);
      this.drawHeader(doc, input);
      this.drawOrderMeta(doc, input);
      this.drawItems(doc, input);
      this.drawTotals(doc, input);
      this.drawFooter(doc);
      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  makeFrLabel(value: string): string {
    const withoutCjk = value.replace(/[\u3400-\u9FFF]/g, '');
    const withoutTrailingPack = withoutCjk.replace(
      /(\s*[xXx]?\s*\*?\s*\d+(\.\d+)?\s*(KG|G|L|ML|PCS|PC|CTN|BOT|BIDON|SAC))\s*$/i,
      '',
    );

    return withoutTrailingPack.replace(/\s+/g, ' ').trim();
  }

  sanitizeLabel(value: string | null | undefined): string {
    const safeValue = (value ?? '').trim();

    if (!safeValue) {
      return '-';
    }

    return safeValue.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  }

  private registerFont(doc: PdfDoc): void {
    if (!this.cjkFontPath) {
      return;
    }

    doc.registerFont('NotoSansSC', this.cjkFontPath);
    doc.font('NotoSansSC');
  }

  private buildApiUrl(req: OrdersRequestContext, path: string): string {
    const normalizedPrefix = (process.env.API_PREFIX ?? 'api').replace(
      /^\/+|\/+$/g,
      '',
    );

    if (this.publicApiBaseUrl) {
      const normalizedBaseUrl = this.publicApiBaseUrl.replace(/\/$/, '');
      return normalizedPrefix
        ? `${normalizedBaseUrl}/${normalizedPrefix}${path}`
        : `${normalizedBaseUrl}${path}`;
    }

    const host = req.get('host') ?? 'localhost:3002';
    const normalizedPath = path.replace(/^\/+/, '');
    const prefixedPath = normalizedPrefix
      ? `/${normalizedPrefix}/${normalizedPath}`
      : `/${normalizedPath}`;

    return `${req.protocol}://${host}${prefixedPath}`;
  }

  private drawHeader(doc: PdfDoc, input: OrderDocumentInput): void {
    doc
      .fillColor('#ab1e24')
      .fontSize(20)
      .text('Commande', { align: 'center' })
      .moveDown(0.5)
      .fillColor('#1f1f1f')
      .fontSize(10)
      .text(`Numero: ${input.orderNumber}`, { align: 'right' })
      .text(`Emission: ${new Date().toISOString().slice(0, 10)}`, {
        align: 'right',
      })
      .moveDown();
  }

  private drawOrderMeta(doc: PdfDoc, input: OrderDocumentInput): void {
    doc
      .fontSize(11)
      .text(`Fournisseur: ${this.sanitizeLabel(input.supplierName)}`)
      .text(`Restaurant: ${this.sanitizeLabel(input.restaurantName)}`)
      .text(`Date de livraison: ${input.deliveryDate}`)
      .text(`Adresse: ${this.sanitizeLabel(input.deliveryAddress)}`)
      .moveDown();
  }

  private drawItems(doc: PdfDoc, input: OrderDocumentInput): void {
    doc.fontSize(10).fillColor('#ab1e24').text('Produits').fillColor('#1f1f1f');
    doc.moveDown(0.3);

    for (const item of input.items) {
      const label = [
        this.sanitizeLabel(item.nameZh),
        this.sanitizeLabel(item.nameFr),
        this.sanitizeLabel(item.specification),
        this.sanitizeLabel(item.unit),
      ]
        .filter((part) => part !== '-')
        .join(' / ');

      doc.text(
        `${label || '-'}  x${item.quantity}  ${item.unitPrice.toFixed(2)} HT  = ${item.lineTotal.toFixed(2)} HT`,
      );
    }

    doc.moveDown();
  }

  private drawTotals(doc: PdfDoc, input: OrderDocumentInput): void {
    doc
      .fontSize(11)
      .fillColor('#ab1e24')
      .text(`Total articles: ${input.totalItems}`, { align: 'right' })
      .text(`Total HT: ${input.totalAmount.toFixed(2)}`, { align: 'right' })
      .fillColor('#1f1f1f');
  }

  private drawFooter(doc: PdfDoc): void {
    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor('#6b6b6b')
      .text('ZHAO Family - document genere automatiquement.', {
        align: 'center',
      });
  }
}
