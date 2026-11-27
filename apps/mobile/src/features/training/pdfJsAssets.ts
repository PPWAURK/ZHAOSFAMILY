import { Asset } from "expo-asset";
import { File, type Directory } from "expo-file-system";

import { PDFJS_LIB_FILE_NAME, PDFJS_WORKER_FILE_NAME } from "@/features/training/trainingViewer";


// pdf.js 3.11.174 (Apache-2.0), bundled so the PDF viewer works offline.
const PDFJS_BUNDLED_FILES = [
  {
    fileName: PDFJS_LIB_FILE_NAME,
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro asset module id
    module: require("../../../assets/pdfjs/pdf.min.js.bin") as number,
  },
  {
    fileName: PDFJS_WORKER_FILE_NAME,
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro asset module id
    module: require("../../../assets/pdfjs/pdf.worker.min.js.bin") as number,
  },
];

async function copyBundledFile(
  directory: Directory,
  fileName: string,
  assetModule: number,
): Promise<void> {
  const destination = new File(directory, fileName);

  if (destination.exists && destination.size > 0) return;

  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error(`pdf.js asset ${fileName} has no local file`);
  }

  new File(asset.localUri).copy(destination);
}

// The WebView only reads inside the viewer directory, so the library files are
// copied next to pdf-viewer.html.
export async function ensurePdfJsAssets(directory: Directory): Promise<void> {
  for (const { fileName, module } of PDFJS_BUNDLED_FILES) {
    await copyBundledFile(directory, fileName, module);
  }
}
