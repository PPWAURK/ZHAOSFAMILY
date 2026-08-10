"use client";

import { useEffect, useRef, useState } from "react";

const PDFJS_VERSION = "3.11.174";
const PDFJS_LIB_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

type PdfCanvasViewerProps = {
  className: string;
  errorClassName: string;
  loadingClassName: string;
  pagesClassName: string;
  source: string;
  title: string;
};

type PdfJsPage = {
  getViewport: (options: { scale: number }) => {
    height: number;
    width: number;
  };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { height: number; width: number };
  }) => { promise: Promise<void> };
};

type PdfJsDocument = {
  destroy: () => void;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  numPages: number;
};

type PdfJsLoadingTask = {
  destroy: () => void;
  promise: Promise<PdfJsDocument>;
};

type PdfJsLibrary = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { url: string }) => PdfJsLoadingTask;
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLibrary;
  }
}

let pdfJsPromise: Promise<PdfJsLibrary> | undefined;

function loadPdfJs(): Promise<PdfJsLibrary> {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);

  if (!pdfJsPromise) {
    pdfJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src = PDFJS_LIB_URL;
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          resolve(window.pdfjsLib);
          return;
        }

        reject(new Error("PDFJS_LOAD_FAILED"));
      };
      script.onerror = () => reject(new Error("PDFJS_LOAD_FAILED"));
      document.head.appendChild(script);
    });
  }

  return pdfJsPromise;
}

async function renderPdfPage(page: PdfJsPage, container: HTMLDivElement): Promise<void> {
  const baseViewport = page.getViewport({ scale: 1 });
  const availableWidth = Math.max(container.clientWidth - 24, 1);
  const viewport = page.getViewport({
    scale: availableWidth / baseViewport.width,
  });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) throw new Error("PDF_CANVAS_UNAVAILABLE");

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  container.appendChild(canvas);

  await page.render({ canvasContext: context, viewport }).promise;
}

export default function PdfCanvasViewer({
  className,
  errorClassName,
  loadingClassName,
  pagesClassName,
  source,
  title,
}: PdfCanvasViewerProps): React.JSX.Element {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask: PdfJsLoadingTask | undefined;
    let pdfDocument: PdfJsDocument | undefined;

    async function renderPdf(): Promise<void> {
      const pages = pagesRef.current;

      if (!pages) return;

      setHasError(false);
      setIsLoading(true);
      pages.replaceChildren();

      try {
        const pdfjsLib = await loadPdfJs();

        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        loadingTask = pdfjsLib.getDocument({ url: source });
        pdfDocument = await loadingTask.promise;

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (isCancelled) return;

          const page = await pdfDocument.getPage(pageNumber);
          await renderPdfPage(page, pages);
        }
      } catch {
        if (!isCancelled) setHasError(true);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void renderPdf();

    return () => {
      isCancelled = true;
      loadingTask?.destroy();
      pdfDocument?.destroy();
    };
  }, [source]);

  return (
    <div className={className} aria-label={title}>
      <div ref={pagesRef} className={pagesClassName} />
      {isLoading ? <span className={loadingClassName}>Loading PDF…</span> : null}
      {hasError ? <span className={errorClassName}>PDF preview unavailable.</span> : null}
    </div>
  );
}
