import { apiClient } from "@/shared/api/api-client";
import type { PurchaseOrder } from "@/features/orders/types/order";

export type OrderPdfShareResult =
  | "shared"
  | "cancelled"
  | "downloaded"
  | "failed";

type OrderPdfFile = {
  blob: Blob;
  fileName: string;
};

function sanitizeDownloadFileName(fileName: string): string {
  return fileName.trim().replace(/[/\\?%*:|"<>]/g, "");
}

function extractContentDispositionFileName(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const encodedFileNameMatch = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i,
  );

  if (encodedFileNameMatch?.[1]) {
    try {
      const decodedFileName = decodeURIComponent(encodedFileNameMatch[1]);
      const safeFileName = sanitizeDownloadFileName(decodedFileName);

      if (safeFileName) {
        return safeFileName;
      }
    } catch {
      return null;
    }
  }

  const quotedFileNameMatch = contentDisposition.match(
    /filename\s*=\s*"([^"]+)"/i,
  );

  if (quotedFileNameMatch?.[1]) {
    const safeFileName = sanitizeDownloadFileName(quotedFileNameMatch[1]);

    if (safeFileName) {
      return safeFileName;
    }
  }

  const bareFileNameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  const safeFileName = bareFileNameMatch?.[1]
    ? sanitizeDownloadFileName(bareFileNameMatch[1])
    : "";

  return safeFileName || null;
}

function buildFallbackOrderPdfFileName(order: PurchaseOrder): string {
  const restaurantName = sanitizeDownloadFileName(String(order.restaurantName || ""));
  const deliveryDate = sanitizeDownloadFileName(String(order.deliveryDate || ""));

  if (restaurantName && deliveryDate) {
    return `${restaurantName} ${deliveryDate}.pdf`;
  }

  const orderNumber = sanitizeDownloadFileName(String(order.number || ""));
  if (orderNumber) {
    return `${orderNumber}.pdf`;
  }

  return `order-${order.id}.pdf`;
}

function scheduleObjectUrlRevoke(objectUrl: string, delayMs: number): void {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), delayMs);
}

async function fetchOrderPdfFile(order: PurchaseOrder): Promise<OrderPdfFile> {
  const response = await apiClient.axios.get<Blob>(
    `/orders/${encodeURIComponent(String(order.id))}/commande`,
    { responseType: "blob" },
  );
  const contentDisposition = response.headers["content-disposition"];
  const fileName =
    extractContentDispositionFileName(
      Array.isArray(contentDisposition)
        ? contentDisposition[0]
        : contentDisposition ?? null,
    ) ?? buildFallbackOrderPdfFileName(order);

  return {
    blob:
      response.data.type === "application/pdf"
        ? response.data
        : new Blob([response.data], { type: "application/pdf" }),
    fileName,
  };
}

async function shareOrderPdfFile(pdfFile: OrderPdfFile): Promise<OrderPdfShareResult> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof File === "undefined"
  ) {
    return "failed";
  }

  const file = new File([pdfFile.blob], pdfFile.fileName, {
    type: "application/pdf",
  });
  const shareData = {
    files: [file],
    title: pdfFile.fileName,
  };

  if (typeof navigator.canShare === "function" && !navigator.canShare(shareData)) {
    return "failed";
  }

  try {
    await navigator.share(shareData);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }

    return "failed";
  }
}

function downloadOrderPdfFile(pdfFile: OrderPdfFile): OrderPdfShareResult {
  const objectUrl = URL.createObjectURL(pdfFile.blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.setAttribute("download", pdfFile.fileName);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  scheduleObjectUrlRevoke(objectUrl, 60_000);

  return "downloaded";
}

export async function shareOrderPdf(order: PurchaseOrder): Promise<OrderPdfShareResult> {
  try {
    const pdfFile = await fetchOrderPdfFile(order);
    const shareResult = await shareOrderPdfFile(pdfFile);

    if (shareResult === "shared" || shareResult === "cancelled") {
      return shareResult;
    }

    return downloadOrderPdfFile(pdfFile);
  } catch {
    return "failed";
  }
}
