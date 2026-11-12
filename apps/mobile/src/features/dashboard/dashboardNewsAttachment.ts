import type { DashboardNewsPost } from "@/features/dashboard/dashboardNewsApi";

export function formatAttachmentSize(sizeBytes: number): string {
  if (!sizeBytes) return "-";
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPdfAttachment(post: DashboardNewsPost): boolean {
  const attachment = post.attachment;

  if (!attachment) {
    return false;
  }

  return (
    attachment.mimeType === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf")
  );
}

export function isImageAttachment(post: DashboardNewsPost): boolean {
  const attachment = post.attachment;

  if (!attachment) {
    return false;
  }

  return (
    attachment.mimeType.toLowerCase().startsWith("image/") ||
    /\.(avif|gif|jpe?g|png|webp)$/i.test(attachment.name)
  );
}
