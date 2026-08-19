import { Directory, File } from "expo-file-system";

import {
  downloadDashboardNewsAttachmentToCache,
  type DashboardNewsAttachment,
} from "@/features/dashboard/dashboardNewsApi";
import {
  buildPdfViewerHtml,
} from "@/features/training/trainingViewer";

export type DashboardNewsPdfViewer = {
  baseUri: string;
  fileUri: string;
};

export async function createDashboardNewsPdfViewer(
  attachment: DashboardNewsAttachment,
  userId: number | string,
): Promise<DashboardNewsPdfViewer> {
  const { directoryUri, fileUri } = await downloadDashboardNewsAttachmentToCache(attachment, userId);
  const pdfDirectory = new Directory(directoryUri);
  const viewerFile = new File(pdfDirectory, "pdf-viewer.html");

  if (!viewerFile.exists || viewerFile.size === 0) {
    const downloadedFile = new File(fileUri);
    const base64Data = await downloadedFile.base64();

    await viewerFile.write(buildPdfViewerHtml(base64Data));
  }

  return {
    baseUri: pdfDirectory.uri,
    fileUri: viewerFile.uri,
  };
}
