import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
  private readonly backendAssetsDir = join(__dirname, '..', '..', 'assets');
  private readonly workspaceBackendAssetsDir = join(
    process.cwd(),
    'apps',
    'backend',
    'assets',
  );
  private readonly cwdAssetsDir = join(process.cwd(), 'assets');
  private readonly logoCandidatePaths = [
    join(this.backendAssetsDir, 'ZHAO-元素element', 'logo', '2-01.png'),
    join(
      this.workspaceBackendAssetsDir,
      'ZHAO-元素element',
      'logo',
      '2-01.png',
    ),
    join(this.cwdAssetsDir, 'ZHAO-元素element', 'logo', '2-01.png'),
    join(this.backendAssetsDir, 'ZHAO', '2-01.png'),
    join(this.workspaceBackendAssetsDir, 'ZHAO', '2-01.png'),
    join(this.cwdAssetsDir, 'ZHAO', '2-01.png'),
    join(this.storageRoot, 'assets', 'ZHAO-元素element', 'logo', '1.png'),
  ];
  private readonly pdfBackgroundCandidatePaths = [
    join(this.backendAssetsDir, 'logo2024', 'logo水印.jpg'),
    join(this.workspaceBackendAssetsDir, 'logo2024', 'logo水印.jpg'),
    join(this.cwdAssetsDir, 'logo2024', 'logo水印.jpg'),
    join(this.backendAssetsDir, 'ZHAO', 'img.png'),
    join(this.workspaceBackendAssetsDir, 'ZHAO', 'img.png'),
    join(this.cwdAssetsDir, 'ZHAO', 'img.png'),
  ];
  private readonly cjkFontCandidatePaths = [
    // Committed font shipped with the backend assets (resolves on the Linux
    // server via git deploy, same pattern as the logo/background paths).
    join(this.backendAssetsDir, 'fonts', 'NotoSansSC-Regular.ttf'),
    join(this.workspaceBackendAssetsDir, 'fonts', 'NotoSansSC-Regular.ttf'),
    join(this.cwdAssetsDir, 'fonts', 'NotoSansSC-Regular.ttf'),
    join(
      process.cwd(),
      'assets',
      'fonts',
      'Noto_Sans_SC',
      'static',
      'NotoSansSC-Regular.ttf',
    ),
    join(process.cwd(), 'assets', 'fonts', 'NotoSansSC-Regular.ttf'),
    join(this.storageRoot, 'assets', 'fonts', 'NotoSansSC-Regular.ttf'),
    '/Library/Fonts/Arial Unicode.ttf',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  ];
  private readonly cjkFontPath = this.cjkFontCandidatePaths.find((path) =>
    existsSync(path),
  );
  private readonly cjkBoldFontCandidatePaths = [
    join(this.backendAssetsDir, 'fonts', 'NotoSansCJKsc-Bold.otf'),
    join(this.workspaceBackendAssetsDir, 'fonts', 'NotoSansCJKsc-Bold.otf'),
    join(this.cwdAssetsDir, 'fonts', 'NotoSansCJKsc-Bold.otf'),
    join(this.storageRoot, 'assets', 'fonts', 'NotoSansCJKsc-Bold.otf'),
    '/System/Library/Fonts/PingFang.ttc',
    '/System/Library/Fonts/STHeiti Medium.ttc',
  ];
  private readonly cjkBoldFontPath = this.cjkBoldFontCandidatePaths.find(
    (path) => existsSync(path),
  );

  private readonly pdfColors = {
    primary: '#ab1e24',
    primaryDark: '#7f1b21',
    text: '#111111',
    textSoft: '#5f4f52',
    muted: '#444444',
    mutedSoft: '#6f6063',
    border: '#e4c3c5',
    rowAlt: '#fdf4f5',
    rowZero: '#fcf7f7',
    white: '#ffffff',
  };

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
      this.drawBackground(doc);
      this.drawHeader(doc, input);
      this.drawOrderMeta(doc, input);
      this.drawItemsTable(doc, input);
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

    return this.replaceControlCharsWithSpaces(safeValue)
      .replace(/\s+/g, ' ')
      .trim();
  }

  private registerFont(doc: PdfDoc): void {
    if (!this.cjkFontPath) {
      throw new InternalServerErrorException(
        'ORDER_PDF_CJK_FONT_NOT_CONFIGURED',
      );
    }

    try {
      doc.registerFont('NotoSansSC', this.cjkFontPath);
      if (this.cjkBoldFontPath) {
        doc.registerFont('NotoSansSCBold', this.cjkBoldFontPath);
      }
      doc.font('NotoSansSC');
    } catch (error) {
      this.logger.error(
        `Failed to register PDF CJK font: ${this.cjkFontPath}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('ORDER_PDF_CJK_FONT_INVALID');
    }
  }

  private buildApiUrl(req: OrdersRequestContext, path: string): string {
    const normalizedPrefix = (process.env.API_PREFIX ?? 'api').replace(
      /^\/+|\/+$/g,
      '',
    );

    if (this.publicApiBaseUrl) {
      const normalizedBaseUrl = this.publicApiBaseUrl.replace(/\/$/, '');
      return `${normalizedBaseUrl}${path}`;
    }

    const host = req.get('host') ?? 'localhost:3002';
    const normalizedPath = path.replace(/^\/+/, '');
    const prefixedPath = normalizedPrefix
      ? `/${normalizedPrefix}/${normalizedPath}`
      : `/${normalizedPath}`;

    return `${req.protocol}://${host}${prefixedPath}`;
  }

  private drawHeader(doc: PdfDoc, input: OrderDocumentInput): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const titleY = doc.y;

    doc
      .rect(left, titleY, right - left, 46)
      .fillColor(this.pdfColors.primary)
      .fill();

    doc
      .fillColor(this.pdfColors.white)
      .font(this.resolveFontForText('Commande', true))
      .fontSize(18)
      .text('Commande', left, titleY + 13, {
        width: right - left,
        align: 'center',
      });

    const logoPath = this.logoCandidatePaths.find((path) => existsSync(path));
    if (logoPath) {
      doc.image(logoPath, left + 8, titleY + 6, { fit: [80, 34] });
    }

    doc
      .fontSize(10)
      .text(`Numero: ${input.orderNumber}`, right - 170, titleY + 6, {
        width: 160,
        align: 'right',
      })
      .text(
        `Emission: ${new Date().toISOString().slice(0, 10)}`,
        right - 170,
        titleY + 20,
        {
          width: 160,
          align: 'right',
        },
      );

    doc.moveDown(2.8);
    doc.fillColor(this.pdfColors.text);
  }

  private drawOrderMeta(doc: PdfDoc, input: OrderDocumentInput): void {
    const left = doc.page.margins.left;
    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const blockY = doc.y;

    doc
      .roundedRect(left, blockY, contentWidth, 74, 8)
      .lineWidth(1)
      .strokeColor(this.pdfColors.border)
      .stroke();

    doc
      .fillColor(this.pdfColors.primaryDark)
      .font(this.resolveCjkFont(true))
      .fontSize(11)
      .text(
        `Fournisseur: ${this.sanitizeLabel(input.supplierName)}`,
        left + 12,
        blockY + 10,
      )
      .text(
        `Etablissement: ${this.sanitizeLabel(input.restaurantName)}`,
        left + 12,
        blockY + 27,
      )
      .text(`Date de livraison: ${input.deliveryDate}`, left + 12, blockY + 44);

    doc
      .fillColor(this.pdfColors.text)
      .font(this.resolveCjkFont(true))
      .fontSize(10)
      .text(
        `Adresse: ${this.sanitizeLabel(input.deliveryAddress)}`,
        left + contentWidth / 2,
        blockY + 27,
        { width: contentWidth / 2 - 12 },
      );

    doc.y = blockY + 86;
  }

  private drawItemsTable(doc: PdfDoc, input: OrderDocumentInput): void {
    const left = doc.page.margins.left;
    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colProduct = Math.floor(contentWidth * 0.52);
    const colQty = Math.floor(contentWidth * 0.1);
    const colOrderUnit = Math.floor(contentWidth * 0.12);
    const colUnitPrice = contentWidth - colProduct - colOrderUnit - colQty;
    const headerRowHeight = 38;

    const drawHeaderRow = () => {
      const y = doc.y;
      doc
        .rect(left, y, contentWidth, headerRowHeight)
        .fillColor(this.pdfColors.primary)
        .fill();
      doc
        .fillColor(this.pdfColors.white)
        .font(this.resolveFontForText('Produit FR / ZH', true))
        .fontSize(10)
        .text('Produit FR / ZH', left + 8, y + 7, { width: colProduct - 12 })
        .text('Qte', left + colProduct + 4, y + 7, {
          width: colQty - 8,
          align: 'center',
        })
        .text('Unite', left + colProduct + colQty + 4, y + 7, {
          width: colOrderUnit - 8,
          align: 'center',
        })
        .text('PU HT', left + colProduct + colOrderUnit + colQty + 4, y + 7, {
          width: colUnitPrice - 8,
          align: 'right',
        });
      doc.y = y + headerRowHeight;
    };

    drawHeaderRow();

    input.items.forEach((item, index) => {
      const productNameFr = this.sanitizePlainLabel(item.nameFr);
      const productNameZh = this.sanitizeLabel(item.nameZh);
      const orderUnit = this.sanitizeLabel(item.unit?.trim() || '-');
      const productColumnWidth = colProduct - 12;
      const productNameFrHeight = this.measureTextHeight(
        doc,
        productNameFr,
        this.resolveFontForText(productNameFr, true),
        10.5,
        productColumnWidth,
      );
      const productNameZhHeight = this.measureTextHeight(
        doc,
        productNameZh,
        this.resolveFontForText(productNameZh, true),
        9.5,
        productColumnWidth,
      );
      const rowHeight = Math.max(
        38,
        productNameFrHeight + productNameZhHeight + 16,
      );

      this.ensureTableSpace(doc, rowHeight, drawHeaderRow);
      this.drawItemRow(doc, {
        colProduct,
        colQty,
        colOrderUnit,
        colUnitPrice,
        contentWidth,
        index,
        item,
        left,
        orderUnit,
        productColumnWidth,
        productNameFr,
        productNameFrHeight,
        productNameZh,
        rowHeight,
      });
    });

    doc.moveDown(0.8);
  }

  private drawItemRow(
    doc: PdfDoc,
    layout: {
      colProduct: number;
      colQty: number;
      colOrderUnit: number;
      colUnitPrice: number;
      contentWidth: number;
      index: number;
      item: OrderDocumentInput['items'][number];
      left: number;
      orderUnit: string;
      productColumnWidth: number;
      productNameFr: string;
      productNameFrHeight: number;
      productNameZh: string;
      rowHeight: number;
    },
  ): void {
    const y = doc.y;
    const isZeroQuantityRow = layout.item.quantity === 0;
    const primaryTextColor = isZeroQuantityRow
      ? this.pdfColors.textSoft
      : this.pdfColors.text;
    const secondaryTextColor = isZeroQuantityRow
      ? this.pdfColors.mutedSoft
      : this.pdfColors.muted;

    if (isZeroQuantityRow || layout.index % 2 === 1) {
      doc
        .rect(layout.left, y, layout.contentWidth, layout.rowHeight)
        .fillColor(
          isZeroQuantityRow ? this.pdfColors.rowZero : this.pdfColors.rowAlt,
        )
        .fill();
    }

    doc
      .fillColor(primaryTextColor)
      .font(this.resolveFontForText(layout.productNameFr, true))
      .fontSize(10.5)
      .text(layout.productNameFr, layout.left + 8, y + 6, {
        width: layout.productColumnWidth,
      });

    doc
      .font(this.resolveFontForText(layout.productNameZh, true))
      .fontSize(9.5)
      .fillColor(secondaryTextColor)
      .text(
        layout.productNameZh,
        layout.left + 8,
        y + 10 + layout.productNameFrHeight,
        {
          width: layout.productColumnWidth,
        },
      );

    doc
      .font('Helvetica-Bold')
      .fillColor(primaryTextColor)
      .fontSize(10)
      .text(
        String(layout.item.quantity),
        layout.left + layout.colProduct + 4,
        y + 13,
        {
          width: layout.colQty - 8,
          align: 'center',
        },
      );

    doc
      .font(this.resolveFontForText(layout.orderUnit, true))
      .fillColor(primaryTextColor)
      .fontSize(10)
      .text(
        layout.orderUnit,
        layout.left + layout.colProduct + layout.colQty + 4,
        y + 13,
        {
          width: layout.colOrderUnit - 8,
          align: 'center',
        },
      );

    doc
      .font('Helvetica-Bold')
      .fillColor(primaryTextColor)
      .fontSize(10)
      .text(
        layout.item.unitPrice.toFixed(2),
        layout.left +
          layout.colProduct +
          layout.colOrderUnit +
          layout.colQty +
          4,
        y + 13,
        { width: layout.colUnitPrice - 8, align: 'right' },
      );

    doc
      .moveTo(layout.left, y + layout.rowHeight)
      .lineTo(layout.left + layout.contentWidth, y + layout.rowHeight)
      .strokeColor(this.pdfColors.border)
      .lineWidth(0.6)
      .stroke();

    doc.y = y + layout.rowHeight;
  }

  private ensureTableSpace(
    doc: PdfDoc,
    requiredHeight: number,
    drawHeaderRow: () => void,
  ): void {
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 90;
    if (doc.y + requiredHeight <= bottomLimit) {
      return;
    }

    doc.addPage();
    this.drawBackground(doc);
    drawHeaderRow();
  }

  private measureTextHeight(
    doc: PdfDoc,
    value: string,
    fontName: string,
    fontSize: number,
    width: number,
  ): number {
    doc.font(fontName).fontSize(fontSize);

    return doc.heightOfString(value, { width });
  }

  private drawTotals(doc: PdfDoc, input: OrderDocumentInput): void {
    const cardWidth = 220;
    const x = doc.page.width - doc.page.margins.right - cardWidth;
    const y = doc.y;

    doc
      .roundedRect(x, y, cardWidth, 36, 8)
      .lineWidth(1)
      .strokeColor(this.pdfColors.primary)
      .stroke();

    doc
      .fillColor(this.pdfColors.primaryDark)
      .font(this.resolveFontForText('Articles total', true))
      .fontSize(11)
      .text(`Articles total: ${input.totalItems}`, x + 10, y + 12, {
        width: cardWidth - 20,
      });

    doc.y = y + 50;
  }

  private drawFooter(doc: PdfDoc): void {
    const footerY = doc.page.height - doc.page.margins.bottom - 20;
    doc
      .font('NotoSansSC')
      .fontSize(9)
      .fillColor(this.pdfColors.muted)
      .text(
        'Document genere automatiquement par la plateforme.',
        doc.page.margins.left,
        footerY,
        {
          width:
            doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'center',
        },
      );
  }

  private drawBackground(doc: PdfDoc): void {
    const backgroundPath = this.pdfBackgroundCandidatePaths.find((path) =>
      existsSync(path),
    );

    if (!backgroundPath) {
      return;
    }

    doc.save();
    doc.opacity(0.12);
    doc.image(backgroundPath, 0, 0, {
      width: doc.page.width,
      height: doc.page.height,
    });
    doc.restore();
  }

  private resolveFontForText(value: string, bold = false): string {
    if (this.containsCjk(value)) {
      return this.resolveCjkFont(bold);
    }

    return bold ? 'Helvetica-Bold' : 'Helvetica';
  }

  private resolveCjkFont(bold = false): string {
    return bold && this.cjkBoldFontPath ? 'NotoSansSCBold' : 'NotoSansSC';
  }

  private sanitizePlainLabel(value: string | null | undefined): string {
    const safeValue = (value ?? '').trim();
    if (!safeValue) return '-';

    return this.replaceControlCharsWithSpaces(safeValue)
      .replace(/\s+/g, ' ')
      .trim();
  }

  private containsCjk(value: string): boolean {
    return /[\u3400-\u9FFF]/.test(value);
  }

  private replaceControlCharsWithSpaces(value: string): string {
    return Array.from(value, (character) =>
      this.isAsciiControlCharacter(character.codePointAt(0)) ? ' ' : character,
    ).join('');
  }

  private isAsciiControlCharacter(codePoint: number | undefined): boolean {
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  }
}
