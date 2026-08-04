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
): Promise<DashboardNewsPdfViewer> {
  const { directoryUri, fileUri } = await downloadDashboardNewsAttachmentToCache(attachment);
  const pdfDirectory = new Directory(directoryUri);
  const viewerFile = new File(pdfDirectory, "pdf-viewer.html");
  const downloadedFile = new File(fileUri);
  const base64Data = await downloadedFile.base64();

  await viewerFile.write(buildPdfViewerHtml(base64Data));

  return {
    baseUri: pdfDirectory.uri,
    fileUri: viewerFile.uri,
  };
}
